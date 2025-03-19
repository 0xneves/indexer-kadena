package process

import (
	"fmt"
	"go-backfill/fetch"
	"go-backfill/repository"
)

func PrepareTransfers(network string, payload fetch.ProcessedPayload, transactionsId []int64) ([]repository.TransferAttributes, error) {
	transactions := payload.Transactions

	const avgTransfersPerTransaction = 80
	transfers := make([]repository.TransferAttributes, 0, len(transactions)*avgTransfersPerTransaction)

	for index, t := range transactions {
		ChainId := payload.Header.ChainId
		coinTransfers := GetCoinTransfers(t.Events, ChainId, t.ReqKey, transactionsId[index])
		nftTransfers := GetNftTransfers(network, ChainId, t.Events, t.ReqKey, transactionsId[index])
		transfers = append(transfers, coinTransfers...)
		transfers = append(transfers, nftTransfers...)
	}

	// TODO: This will be removed after TransactionDetails migration
	// if network == "mainnet01" {
	// 	return transfers, nil
	// }

	coinbaseDecoded, err := decodeCoinbase(string(payload.Coinbase))
	if err != nil {
		return nil, fmt.Errorf("decoding Coinbase JSON of block: %w", err)
	}

	var coinbaseTxId = transactionsId[len(transactionsId)-1]
	coinTransfers := GetCoinTransfers(coinbaseDecoded.Events, payload.Header.ChainId, coinbaseDecoded.ReqKey, coinbaseTxId)
	transfers = append(transfers, coinTransfers...)

	return transfers, nil
}
