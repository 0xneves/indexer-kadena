import pLimit from 'p-limit';
import { rootPgPool, sequelize } from '../../config/database';
import { getGuardsFromBalances } from './payload';
import Guard from '../../models/guard';

const CONCURRENCY_LIMIT = 50; // Number of concurrent fetches allowed
const limitFetch = pLimit(CONCURRENCY_LIMIT);

export async function backfillGuards() {
  console.info('[INFO][WORKER][BIZ_FLOW] Starting guards backfill ...');

  const deleteGuardsQuery = `
    DELETE FROM "Guards";
    ALTER SEQUENCE "Guards_id_seq" RESTART WITH 1;
  `;

  await rootPgPool.query(deleteGuardsQuery);

  const limit = 1000; // Number of rows to process in one batch
  let currentId = 0;

  while (true) {
    console.info(`[INFO][DB][METRIC] Processing guards batch: ${currentId}-${currentId + limit}`);
    const res = await rootPgPool.query(
      `
        SELECT b.id, b.account, b."chainId", b.module
        FROM "Balances" b
        WHERE b.id > $2
        ORDER BY b.id
        LIMIT $1
      `,
      [limit, currentId],
    );

    const rows = res.rows;
    if (rows.length === 0) {
      console.info('[INFO][DB][DATA_MISSING] No more balance rows to process.');
      break;
    }

    // Use p-limit to ensure controlled concurrency for fetch requests
    const fetchPromises = rows.map(row =>
      limitFetch(() =>
        getGuardsFromBalances([
          {
            id: row.id,
            account: row.account,
            chainId: row.chainId,
            module: row.module,
          },
        ]),
      ),
    );
    const guards = (await Promise.all(fetchPromises)).flat();
    const tx = await sequelize.transaction();
    try {
      await Guard.bulkCreate(guards, {
        transaction: tx,
      });

      await tx.commit();
      console.info(`[INFO][DB][BIZ_FLOW] Row at ${currentId} id processed successfully.`);
      currentId = rows[rows.length - 1].id;
    } catch (batchError) {
      console.error(`Error processing at id ${currentId}:`, batchError);
      try {
        await tx.rollback();
        console.info(`[INFO][DB][BIZ_FLOW] Transaction for id at ${currentId} rolled back.`);
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      break;
    }
  }
  console.info('[INFO][WORKER][BIZ_FLOW] Guards backfilled successfully.');
}
