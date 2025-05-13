/**
 * Utilities for calculating the circulating supply of KDA coins
 *
 * This file provides functions for determining the total circulating supply of KDA coins
 * by combining miner rewards from block production and token payments from the initial
 * distribution. It reads from CSV files containing historical data and calculates
 * the current circulation based on blockchain height and timestamp.
 */

import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

/**
 * Type definition for a row in the miner rewards CSV file
 * First element is the height, second is the reward amount
 */
type RewardRow = [number, number];

/**
 * Calculates the total miner rewards issued up to a specific block height
 *
 * This function processes the miner rewards CSV data to determine how many
 * KDA coins have been issued as mining rewards up to the specified height.
 * It handles the multi-chain structure of Kadena by dividing the height by
 * the number of chains (20) to get the average chain height.
 *
 * For heights that fall between rows in the CSV, it calculates proportional
 * rewards based on the nearest defined reward values.
 *
 * @param csvContent - The CSV content containing height and reward data
 * @param cutHeight - The total block height to calculate rewards up to
 * @returns The total miner rewards issued up to the specified height
 */
function calculateReward(csvContent: string, cutHeight: number): number {
  // Parse the CSV content using PapaParse library
  // Each row should have two elements: block height and reward amount
  const parsed = Papa.parse<RewardRow>(csvContent, {
    delimiter: ',',
    skipEmptyLines: true,
    transformHeader: undefined,
    // Convert string values to proper types: first column to integer, second to float
    transform: (value, fieldIndex) => (fieldIndex === 0 ? parseInt(value, 10) : parseFloat(value)),
  });

  // Convert the total block height to average chain height
  // This is necessary because Kadena has multiple chains (20 chains)
  // and the rewards are defined by average chain height in the CSV
  const averageHeight = cutHeight / 20; // number of chains

  let totalReward = 0;

  // Process each row in the CSV, which define reward amounts at specific heights
  for (let i = 0; i < parsed.data.length; i += 1) {
    const row = parsed.data[i];
    // Get the previous height (or 0 if this is the first row)
    const previousHeight = i === 0 ? 0 : parsed.data[i - 1][0];
    const height = row[0];
    const reward = row[1];

    // Case: If our target height is below the current row's height,
    // we need to calculate a partial reward based on the proportion of heights
    if (averageHeight < height) {
      // Calculate how many blocks we have in this reward period
      const remainingHeight = averageHeight - previousHeight;
      // Calculate the reward proportionally to the height
      const proportionedReward = remainingHeight * reward;
      totalReward += proportionedReward;
      break; // We've reached our target height, so stop processing
    }

    // Otherwise, add the full reward for this period (height range)
    // multiplied by the number of blocks in the period
    totalReward = totalReward + reward * (height - previousHeight);
  }

  return totalReward;
}

/**
 * Type definition for a row in the token payments CSV file
 * Contains chain ID, creation time, request key, amount, and another value
 */
type CsvRow = [string, string, string, number, number];

/**
 * Calculates the total token payments made up to a specific timestamp
 *
 * This function processes the token payments CSV data to determine how many
 * KDA coins have been distributed through initial token allocations up to
 * the specified timestamp. It accumulates all payment amounts chronologically
 * until it reaches the target timestamp.
 *
 * @param csvContent - The CSV content containing payment data
 * @param targetTimestamp - The timestamp (in milliseconds) to calculate payments up to
 * @returns The total token payments made up to the specified timestamp
 */
function calculateTokenPayments(csvContent: string, targetTimestamp: number): number {
  // Parse the CSV content using PapaParse library
  // Each row should contain chain ID, creation time, request key, amount, and another value
  const parsed = Papa.parse<CsvRow>(csvContent, {
    delimiter: ',',
    skipEmptyLines: true,
    // Convert numerical fields (3, 4) to floats, leave others as strings
    transform: (value, fieldIndex) => {
      if (fieldIndex === 3 || fieldIndex === 4) {
        return parseFloat(value);
      }
      return value;
    },
  });

  let totalSum = 0;
  let previousRow: CsvRow | null = null;

  // Convert millisecond timestamp to seconds for date comparison
  // The token payments CSV has ISO date strings, but timestamp is in milliseconds
  const targetDate = new Date(targetTimestamp / 1000);

  // Process each row in chronological order
  for (const row of parsed.data) {
    const creationTimeISO = row[1]; // ISO date string
    const amount = row[3]; // Payment amount

    // Convert ISO string to Date object for comparison
    const creationDate = new Date(creationTimeISO);

    // If this row's date is after our target date, stop processing
    // (we only want payments made up to the target date)
    if (targetDate < creationDate) {
      break;
    }

    // Add this payment to our running total
    totalSum += amount;
    previousRow = row;
  }

  return totalSum;
}

/**
 * Reads the content of a CSV file asynchronously
 *
 * @param filePath - The path to the CSV file
 * @returns Promise resolving to the file content as a string
 */
async function getCsvContent(filePath: string): Promise<string> {
  // Wrap the Node.js file system's callback-based readFile function
  // in a Promise to enable async/await usage
  return new Promise((resolve, reject) => {
    // Read the file using the filesystem module
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        // If an error occurs (file not found, permission issues, etc.),
        // reject the promise with the error
        reject(err);
      } else {
        // If file is read successfully, resolve the promise with the file contents
        resolve(data);
      }
    });
  });
}

/**
 * Gets the total miner rewards issued up to a specific block height
 *
 * This function retrieves and processes the miner rewards data from the CSV file
 * to calculate the total rewards issued up to the specified height.
 *
 * @param cutHeight - The total block height to calculate rewards up to
 * @returns Promise resolving to the total miner rewards
 */
async function getMinerRewards(cutHeight: number) {
  // Construct the absolute path to the miner rewards CSV file
  // __dirname is the directory of the current module
  // Navigate to the circulating-coins directory from the current location
  const filePath = path.resolve(__dirname, '../circulating-coins/miner_rewards.csv');

  // Read the CSV file contents asynchronously
  const csvContent = await getCsvContent(filePath);

  // Process the CSV content to calculate total rewards up to the specified height
  const reward = calculateReward(csvContent, cutHeight);

  // Return the total miner rewards
  return reward;
}

/**
 * Gets the total token payments made up to a specific timestamp
 *
 * This function retrieves and processes the token payments data from the CSV file
 * to calculate the total payments made up to the specified timestamp.
 *
 * @param latestCreationTime - The timestamp (in milliseconds) to calculate payments up to
 * @returns Promise resolving to the total token payments
 */
async function getTokenPayments(latestCreationTime: number) {
  // Construct the absolute path to the token payments CSV file
  // Similar to the miner rewards file but with a different filename
  const filePath = path.resolve(__dirname, '../circulating-coins/token_payments.csv');

  // Read the CSV file contents asynchronously
  const csvContent = await getCsvContent(filePath);

  // Process the CSV content to calculate total token payments up to the specified timestamp
  const tokenPayments = calculateTokenPayments(csvContent, latestCreationTime);

  // Return the total token payments
  return tokenPayments;
}

/**
 * Calculates the total circulating supply of KDA coins
 *
 * This function combines the miner rewards and token payments to determine
 * the total number of KDA coins in circulation at a specific block height
 * and timestamp.
 *
 * @param cutHeight - The total block height to calculate circulation up to
 * @param latestCreationTime - The timestamp (in milliseconds) to calculate circulation up to
 * @returns Promise resolving to the total circulating supply of KDA coins
 */
export async function getCirculationNumber(cutHeight: number, latestCreationTime: number) {
  // Step 1: Get the total miner rewards that have been issued so far
  // (based on block height)
  const minerRewards = await getMinerRewards(cutHeight);

  // Step 2: Get the total token payments that have been made so far
  // (based on timestamp)
  const tokenPayments = await getTokenPayments(latestCreationTime);

  // Step 3: The total circulating supply is the sum of miner rewards and token payments
  // This represents all KDA coins that have been released into circulation
  return minerRewards + tokenPayments;
}
