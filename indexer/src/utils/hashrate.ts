/**
 * Utility functions for calculating blockchain network hashrate
 *
 * This file provides functions to calculate the network hashrate based on block
 * difficulty and timestamps. The hashrate is an important metric that indicates
 * the computational power of the blockchain network.
 */

import { BlockWithDifficulty } from './difficulty';

/**
 * Aggregates block data to calculate total difficulty and earliest block time
 *
 * This helper function processes an array of blocks to find:
 * 1. The earliest block timestamp in the set
 * 2. The total accumulated difficulty of all blocks
 *
 * These values are used in hashrate calculations to determine the average
 * computational work performed over a specific time period.
 *
 * @param blocks - Array of block objects containing creation time and difficulty
 * @returns Object with earliestTime (milliseconds timestamp) and totalDifficulty
 */
function aggregateBlockData(blocks: { creationTimeDate: Date; difficulty: bigint }[]): {
  earliestTime: number;
  totalDifficulty: bigint;
} {
  let earliestTime = Number.MAX_SAFE_INTEGER;
  let totalDifficulty = 0n;

  for (const block of blocks) {
    const blockTimeMillis = block.creationTimeDate.getTime();
    if (blockTimeMillis < earliestTime) {
      earliestTime = blockTimeMillis;
    }
    totalDifficulty += block.difficulty;
  }

  return { earliestTime, totalDifficulty };
}

/**
 * Calculates the current network hashrate based on block difficulty and time
 *
 * This function computes the average hashrate of the network by:
 * 1. Determining the total difficulty of a set of blocks
 * 2. Finding the time span between the earliest block and now
 * 3. Dividing total difficulty by time (in seconds) to get hashes per second
 *
 * If the time difference is less than one second, returns 0 to avoid division by zero
 * or extreme values from very short time spans.
 *
 * @param blocksWithDifficulty - Array of blocks with their difficulty information
 * @returns The calculated network hashrate as a bigint (hashes per second)
 */
export function calculateNetworkHashRate(blocksWithDifficulty: BlockWithDifficulty[]): bigint {
  const { earliestTime, totalDifficulty } = aggregateBlockData(blocksWithDifficulty);

  const timeDifference = Date.now() - earliestTime;

  return timeDifference < 1000 ? 0n : totalDifficulty / (BigInt(timeDifference) / 1000n);
}
