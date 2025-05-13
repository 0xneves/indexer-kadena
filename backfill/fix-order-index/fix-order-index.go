package main

import (
	"context"
	"flag"
	"fmt"
	"go-backfill/config"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
)

const (
	batchSize = 10000 // Reduced batch size for better performance
)

type Event struct {
	ID         int64
	OrderIndex int64
}

func fixBatchOrderIndex(conn *pgx.Conn, lastTransactionId int64) (bool, int64, error) {
	startTime := time.Now()

	// Start transaction for writes
	tx, err := conn.Begin(context.Background())
	if err != nil {
		return false, lastTransactionId, fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback(context.Background())

	// Get transactions in batch
	query := `
		SELECT DISTINCT t.id
		FROM "Transactions" t
		JOIN "Events" e ON e."transactionId" = t.id
		WHERE t.id > $1
		ORDER BY t.id ASC
		LIMIT $2
	`

	rows, err := tx.Query(context.Background(), query, lastTransactionId, batchSize)
	if err != nil {
		return false, lastTransactionId, fmt.Errorf("failed to query transactions: %v", err)
	}
	defer rows.Close()

	var transactionIds []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return false, lastTransactionId, fmt.Errorf("failed to scan transaction id: %v", err)
		}
		transactionIds = append(transactionIds, id)
	}

	if len(transactionIds) == 0 {
		return false, lastTransactionId, nil
	}

	// Update all events in a single query using window functions
	updateQuery := `
		WITH OrderedEvents AS (
			SELECT 
				e.id,
				ROW_NUMBER() OVER (PARTITION BY e."transactionId" ORDER BY e.id) - 1 as new_order_index
			FROM "Events" e
			WHERE e."transactionId" = ANY($1::bigint[])
		)
		UPDATE "Events" e
		SET "orderIndex" = oe.new_order_index
		FROM OrderedEvents oe
		WHERE e.id = oe.id
		AND (e."orderIndex" IS NULL OR e."orderIndex" != oe.new_order_index)
		RETURNING e.id
	`

	rows, err = tx.Query(context.Background(), updateQuery, transactionIds)
	if err != nil {
		return false, lastTransactionId, fmt.Errorf("failed to execute update: %v", err)
	}
	defer rows.Close()

	var updatedCount int
	for rows.Next() {
		updatedCount++
	}

	if err := tx.Commit(context.Background()); err != nil {
		return false, lastTransactionId, fmt.Errorf("failed to commit transaction: %v", err)
	}

	elapsed := time.Since(startTime)
	log.Printf("Fixed order_index for %d events in %d transactions. Batch time: %.2fs", updatedCount, len(transactionIds), elapsed.Seconds())

	lastProcessedId := transactionIds[len(transactionIds)-1]
	return len(transactionIds) == batchSize, lastProcessedId, nil
}

func main() {
	envFile := flag.String("env", ".env", "Path to the .env file")
	flag.Parse()

	config.InitEnv(*envFile)
	env := config.GetConfig()

	// Database connection
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		env.DbHost, env.DbPort, env.DbUser, env.DbPassword, env.DbName)

	conn, err := pgx.Connect(context.Background(), connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer conn.Close(context.Background())

	log.Println("Connected to database")

	lastId := int64(0)
	hasMore := true
	processedTransactions := int64(0)

	for hasMore {
		var err error
		hasMore, lastId, err = fixBatchOrderIndex(conn, lastId)
		if err != nil {
			log.Fatalf("Error during batch processing: %v", err)
		}
		processedTransactions += batchSize

		if hasMore {
			log.Printf("Progress: Processed up to transaction ID %d", lastId)
		} else {
			log.Printf("Progress: Completed all transactions")
		}

		time.Sleep(100 * time.Millisecond)
	}

	log.Println("Order index fix completed successfully")
}
