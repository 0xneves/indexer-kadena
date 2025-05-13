/**
 * Contract Management Service
 *
 * This module provides functionality for managing blockchain token contracts in the indexer database.
 * It handles synchronization, retrieval, and storage of contract data for both fungible tokens and NFTs.
 *
 * The module is responsible for:
 * 1. Retrieving token contract metadata from the blockchain
 * 2. Storing contract information in the database
 * 3. Providing lookups for existing contracts
 * 4. Managing relationships between tokens and their contracts
 */

import { handleSingleQuery } from '@/utils/raw-query';
import Contract, { ContractAttributes } from '@/models/contract';

/**
 * Synchronizes a token contract by retrieving its manifest data from the blockchain.
 * This function is primarily used for NFTs (poly-fungible tokens) that have token-specific
 * metadata stored in a manifest.
 *
 * The function:
 * 1. Queries the blockchain for the token's manifest using the module's get-manifest function
 * 2. Saves the contract and manifest data to the database if found
 * 3. Returns the contract ID for reference
 *
 * @param {number} chainId - The blockchain chain ID where the contract exists
 * @param {any} modulename - The name of the module/contract (e.g., "marmalade.ledger")
 * @param {any} tokenId - The unique identifier for the specific token
 * @returns {Promise<number|undefined>} The contract ID if successfully synchronized, undefined otherwise
 */
export async function syncContract(chainId: number, modulename: any, tokenId: any) {
  // Query the blockchain for the token's manifest
  // This calls the get-manifest function on the token's contract to retrieve metadata
  const manifestData = await handleSingleQuery({
    chainId: chainId.toString(),
    code: `(${modulename}.get-manifest "${tokenId}")`,
  });

  let contractId;

  // If the manifest query was successful (no error)
  if (!manifestData.error) {
    // Save the contract with manifest data to the database
    // This marks it as a poly-fungible (NFT) token with its tokenId and manifest
    contractId = await saveContract(
      chainId,
      modulename,
      'poly-fungible', // This is an NFT type
      tokenId,
      manifestData.result, // The manifest contains metadata about the token
    );
  } else {
    // Log if we couldn't retrieve a manifest for this token
    console.info('[INFO][SYNC][CONTRACT] No manifest URI found for token ID:', tokenId);
  }

  // Return the contract ID for reference by the caller
  return contractId;
}

/**
 * Saves a contract to the database, handling both new contracts and updates to existing ones.
 * This function is used by both NFT and fungible token handling code to ensure contracts are
 * properly tracked in the database.
 *
 * The function:
 * 1. Creates a contract data object with all necessary attributes
 * 2. Checks if the contract already exists in the database
 * 3. Creates a new contract record if it doesn't exist
 * 4. Returns the contract ID regardless of whether it's new or existing
 *
 * @param {number} chainId - The blockchain chain ID where the contract exists
 * @param {any} modulename - The name of the module/contract
 * @param {string} type - The type of contract ('fungible' or 'poly-fungible')
 * @param {any} tokenId - The token ID for NFTs, undefined for fungible tokens
 * @param {any} manifestData - Metadata from the token's manifest (for NFTs)
 * @param {number} precision - Decimal precision for fungible tokens
 * @returns {Promise<number>} The ID of the saved contract
 *
 * TODO: [OPTIMIZATION] Consider implementing batch operations for contracts to reduce database operations
 */
export async function saveContract(
  chainId: number,
  modulename: any,
  type: string,
  tokenId?: any,
  manifestData?: any,
  precision?: number,
) {
  // Prepare the contract data to be saved
  // This includes all the attributes needed to represent the contract in the database
  const contractData = {
    chainId: chainId,
    module: modulename,
    type: type, // 'fungible' or 'poly-fungible'
    metadata: manifestData, // For NFTs, this contains information about the token
    tokenId: tokenId, // Only for NFTs, uniquely identifies the token
    precision: precision, // Only for fungible tokens, specifies decimal places
  } as ContractAttributes;

  let contractId;

  // Check if this contract already exists in the database
  // For NFTs, we look for a match on chainId, module, and tokenId
  // For fungible tokens, tokenId will be undefined, so we match on chainId and module
  const existingContract = await Contract.findOne({
    where: {
      chainId: contractData.chainId,
      module: contractData.module,
      tokenId: tokenId,
    },
  });

  // If the contract doesn't exist yet, create it
  if (!existingContract) {
    const newContract = await Contract.create(contractData);
    contractId = newContract.id;
  }
  // If it already exists, use the existing ID
  else {
    contractId = existingContract.id;

    // Note: We don't update existing contracts with new data
    // TODO: [OPTIMIZATION] Consider adding logic to update contracts with new metadata if needed
  }

  // Return the contract ID for reference
  return contractId;
}

/**
 * Retrieves a contract from the database by chainId and module name.
 * This is typically used for fungible tokens where there's one contract per token type,
 * rather than NFTs where each token ID has its own contract record.
 *
 * The function:
 * 1. Queries the database for a contract matching the provided chainId and module
 * 2. Returns the contract if found, or null if not found
 *
 * @param {number} chainId - The blockchain chain ID where the contract exists
 * @param {any} modulename - The name of the module/contract
 * @returns {Promise<Contract|null>} The contract if found, null otherwise
 */
export async function getContract(chainId: number, modulename: any) {
  // Find the first contract matching this chainId and module
  // For fungible tokens, this uniquely identifies the contract
  // For NFTs, this might return any token from that collection
  const contract = await Contract.findOne({
    where: {
      chainId: chainId,
      module: modulename,
    },
  });

  // Return the contract or null if not found
  return contract;
}
