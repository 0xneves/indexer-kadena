/**
 * Implementation of the PactGateway interface for interacting with Pact smart contracts
 *
 * This file provides a concrete implementation of the PactGateway interface that
 * communicates directly with the Kadena blockchain using Pact query operations.
 * It specializes in retrieving NFT information from Marmalade v2 contracts.
 */

import { handleSingleQuery } from '../../../../utils/raw-query';
import PactGateway, { GetNftsInfoParams } from '../../gateway/pact-gateway';

/**
 * Concrete implementation of the PactGateway interface
 *
 * This class implements the PactGateway interface by executing Pact queries
 * against the Kadena blockchain. It uses the handleSingleQuery utility to
 * manage communication with the blockchain node.
 */
export default class PactApiGateway implements PactGateway {
  /**
   * Retrieves detailed information about multiple NFTs from the blockchain
   *
   * This implementation fetches NFT data by executing multiple Pact queries against
   * the Marmalade v2 NFT standard contracts. For each NFT, it makes three separate queries:
   * 1. get-token-info: Retrieves basic token metadata (URI, supply, precision)
   * 2. get-version: Retrieves the token's version information
   * 3. details: Retrieves account-specific information like balance and guard
   *
   * The method processes all queries in parallel for efficiency, then combines
   * the results into a unified NFT information object.
   *
   * @param data - Array of NFT identifiers to query
   * @param account - Account address to check balances for
   * @returns Promise resolving to an array of NFT information objects
   */
  async getNftsInfo(data: GetNftsInfoParams, account: string) {
    // Execute queries for each NFT in parallel
    const promises = data.map(async nft => {
      // Query 1: Get basic token information
      const query = {
        chainId: nft.chainId,
        code: `(marmalade-v2.ledger.get-token-info \"${nft.tokenId}\")`,
      };
      const res = await handleSingleQuery(query);
      const result = JSON.parse(res.result ?? '{}');

      // Query 2: Get token version information
      const versionQuery = {
        chainId: nft.chainId,
        code: `(marmalade-v2.ledger.get-version \"${nft.tokenId}\")`,
      };
      const versionRes = await handleSingleQuery(versionQuery);
      const versionResult = JSON.parse(versionRes.result ?? '{}');

      // Query 3: Get account-specific balance and guard information
      const balanceQuery = {
        chainId: nft.chainId,
        code: `(marmalade-v2.ledger.details "${nft.tokenId}" "${account}")`,
      };
      const balanceRes = await handleSingleQuery(balanceQuery);
      const balanceResult = JSON.parse(balanceRes.result ?? '{}');

      // Combine all query results into a single NFT information object
      return {
        version: versionResult.int ?? 'unknown',
        uri: result.uri ?? 'unknown',
        supply: result?.supply ? Number(result.supply) : 0,
        precision: result?.precision?.int ? Number(result.precision.int) : 0,
        balance: balanceResult.balance ? Number(balanceResult.balance) : 0,
        guard: {
          keys: balanceResult?.guard?.keys ?? [],
          predicate: balanceResult?.guard?.pred ?? '',
          raw: JSON.stringify({
            keys: balanceResult?.guard?.keys ?? [],
            predicate: balanceResult?.guard?.pred ?? '',
          }),
        },
      };
    });

    // Wait for all NFT queries to complete
    const nfts = await Promise.all(promises);
    return nfts;
  }
}
