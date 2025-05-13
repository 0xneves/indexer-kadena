/**
 * Balances Synchronization Service
 *
 * This module provides functionality to synchronize account balance information
 * in the Kadena blockchain indexer. Balances represent the ownership of tokens
 * (both fungible and non-fungible) across different chains and accounts.
 *
 * The service includes:
 * 1. Backfill functionality to rebuild the balances database from transfer history
 * 2. Optimized SQL operations to handle large datasets efficiently
 * 3. Conflict handling to ensure data consistency
 *
 * Balances are central to tracking token ownership, distribution, and wealth across
 * the blockchain ecosystem. This service ensures the indexer maintains a comprehensive
 * and consistent view of token balances derived from transfer activities.
 */

import { rootPgPool } from '@/config/database';

/**
 * Backfills balance information by aggregating data from the Transfers table.
 *
 * This function performs a balance reconstruction by:
 * 1. Identifying all unique account-module-chain combinations from transfer records
 * 2. Creating balance entries for each unique combination
 * 3. Using SQL features to optimize the operation and handle conflicts
 *
 * Rather than calculating actual balance amounts, this function focuses on creating
 * the necessary balance records. The actual balance amounts are computed separately
 * through aggregation of transfer data when needed.
 *
 * @returns {Promise<void>} A promise that resolves when the backfill is complete
 */
export async function backfillBalances() {
  // Execute a complex SQL query to backfill balances from transfer history
  await rootPgPool.query(
    `
      BEGIN;
      SET enable_seqscan = OFF;
      WITH combined AS (
          SELECT "chainId", "from_acct" AS "account", "modulename" AS "module"
          FROM "Transfers"
          UNION ALL
          SELECT "chainId", "to_acct" AS "account", "modulename" AS "module"
          FROM "Transfers"
      )
      INSERT INTO "Balances" ("chainId", "account", "module", "createdAt", "updatedAt", "tokenId")
      SELECT "chainId", "account", "module", NOW() AS "createdAt", NOW() AS "updatedAt", '' AS "tokenId"
      FROM combined
      GROUP BY "chainId", "account", "module"
      ON CONFLICT ("chainId", "account", "module", "tokenId") DO NOTHING;
      COMMIT;
    `,
  );

  // Log successful completion of the backfill operation
  console.info('[INFO][SYNC][BALANCES] Balances backfilled successfully.');
}
