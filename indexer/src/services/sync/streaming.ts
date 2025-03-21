import { processPayloadKey } from './payload';
import { getDecoded, getRequiredEnvString } from '../../utils/helpers';
import EventSource from 'eventsource';
import { DispatchInfo } from '../../jobs/publisher-job';
import { uint64ToInt64 } from '../../utils/int-uint-64';
import Block, { BlockAttributes } from '../../models/block';
import { sequelize } from '../../config/database';
import StreamingError from '../../models/streaming-error';
import { backfillGuards } from './guards';

const SYNC_BASE_URL = getRequiredEnvString('SYNC_BASE_URL');
const SYNC_NETWORK = getRequiredEnvString('SYNC_NETWORK');

export async function startStreaming() {
  console.log('Starting streaming...');

  const blocksAlreadyReceived = new Set<string>();

  const eventSource = new EventSource(`${SYNC_BASE_URL}/${SYNC_NETWORK}/block/updates`);

  eventSource.onerror = (error: any) => {
    console.error('Connection error:', error);
  };

  eventSource.addEventListener('BlockHeader', async (event: any) => {
    try {
      const block = JSON.parse(event.data);
      const payload = processPayload(block.payloadWithOutputs);
      if (blocksAlreadyReceived.has(block.header.hash)) {
        return;
      }
      blocksAlreadyReceived.add(block.header.hash);
      const blockData = await saveBlock({ header: block.header, payload });
      if (blockData === null) {
        await StreamingError.create({
          hash: block.header.hash,
          chainId: block.header.chainId,
        });
        return;
      }
    } catch (error) {
      console.log(error);
    }
  });

  setInterval(
    () => {
      console.log('Clearing blocks already received.');
      blocksAlreadyReceived.clear();
    },
    1000 * 60 * 10,
  );

  backfillGuards(); // run when initialize
  setInterval(backfillGuards, 1000 * 60 * 60); // every one hour
}

function processPayload(payload: any) {
  const transactions = payload.transactions;
  transactions.forEach((transaction: any) => {
    transaction[0] = getDecoded(transaction[0]);
    transaction[1] = getDecoded(transaction[1]);
  });

  const minerData = getDecoded(payload.minerData);
  const transactionsHash = payload.transactionsHash;
  const outputsHash = payload.outputsHash;
  const coinbase = getDecoded(payload.coinbase);

  const payloadData = {
    transactions: transactions,
    minerData: minerData,
    transactionsHash: transactionsHash,
    outputsHash: outputsHash,
    payloadHash: payload.payloadHash,
    coinbase: coinbase,
  };

  return payloadData;
}

async function saveBlock(parsedData: any): Promise<DispatchInfo | null> {
  const headerData = parsedData.header;
  const payloadData = parsedData.payload;
  const transactions = payloadData.transactions || [];

  const tx = await sequelize.transaction();

  try {
    const blockAttribute = {
      nonce: headerData.nonce,
      creationTime: headerData.creationTime,
      parent: headerData.parent,
      adjacents: headerData.adjacents,
      target: headerData.target,
      payloadHash: headerData.payloadHash,
      chainId: headerData.chainId,
      weight: headerData.weight,
      height: headerData.height,
      chainwebVersion: headerData.chainwebVersion,
      epochStart: headerData.epochStart,
      featureFlags: uint64ToInt64(headerData.featureFlags),
      hash: headerData.hash,
      minerData: payloadData.minerData,
      transactionsHash: payloadData.transactionsHash,
      outputsHash: payloadData.outputsHash,
      coinbase: payloadData.coinbase,
      transactionsCount: transactions.length,
    } as BlockAttributes;

    const createdBlock = await Block.create(blockAttribute, {
      transaction: tx,
    });

    const eventsCreated = await processPayloadKey(createdBlock, payloadData, tx);

    const uniqueRequestKeys = new Set(eventsCreated.map(t => t.requestkey).filter(Boolean));

    const uniqueQualifiedEventNames = new Set(
      eventsCreated.map(t => `${t.module}.${t.name}`).filter(Boolean),
    );

    await tx.commit();
    return {
      hash: createdBlock.hash,
      chainId: createdBlock.chainId.toString(),
      height: createdBlock.height,
      requestKeys: Array.from(uniqueRequestKeys),
      qualifiedEventNames: Array.from(uniqueQualifiedEventNames),
    };
  } catch (error) {
    await tx.rollback();
    console.error(`Error saving block to the database: ${error}`);
    return null;
  }
}
