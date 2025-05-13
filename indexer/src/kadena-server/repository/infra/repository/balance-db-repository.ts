/**
 * Balance Database Repository Implementation
 *
 * Implements the BalanceRepository interface to provide data access for token balances
 * stored in PostgreSQL. Supports both fungible tokens (like 'coin') and non-fungible
 * tokens (NFTs) in the Kadena blockchain system.
 *
 * Key features:
 * - Retrieves account information across chains
 * - Supports fungible token balance queries
 * - Provides NFT ownership lookups
 * - Includes both indexed DB access and direct node queries
 * - Handles public key-based account lookups
 */
import { rootPgPool } from '../../../../config/database';
import BalanceModel from '../../../../models/balance';
import { formatBalance_NODE, formatGuard_NODE } from '../../../../utils/chainweb-node';
import { handleSingleQuery } from '../../../../utils/raw-query';
import BalanceRepository, {
  FungibleAccountOutput,
  FungibleChainAccountOutput,
  GetTokensParams,
  INonFungibleAccount,
  INonFungibleChainAccount,
  INonFungibleTokenBalance,
} from '../../application/balance-repository';
import {
  getNonFungibleAccountBase64ID,
  getNonFungibleChainAccountBase64ID,
} from '../base64-id-generators';
import { fungibleAccountValidator } from '../schema-validator/fungible-account-validator';
import { fungibleChainAccountValidator } from '../schema-validator/fungible-chain-account-validator';
import { nonFungibleTokenBalanceValidator } from '../schema-validator/non-fungible-token-balance-validator';
import { getPageInfo, getPaginationParams } from '../../pagination';

/**
 * PostgreSQL implementation of the BalanceRepository interface
 * Provides data access methods for retrieving and querying token balances
 */
export default class BalanceDbRepository implements BalanceRepository {
  /**
   * Retrieves account information for a specific account and fungible token
   *
   * @param accountName - The account name to query
   * @param fungibleName - The fungible token module name (defaults to 'coin')
   * @returns Account information with total balance across all chains
   * @throws Error if account is not found
   */
  // TODO: waiting for orphan blocks mechanism to be ready
  async getAccountInfo(accountName: string, fungibleName = 'coin') {
    const account = await BalanceModel.findOne({
      where: {
        account: accountName,
        ...(fungibleName && { module: fungibleName }),
      },
    });

    const totalBalanceQuery = `
      select b.account, sum(balance) as "totalBalance"
      from "Balances" b
      where b.account = $1
      and b.module = $2
      group by b.account
    `;

    const { rows } = await rootPgPool.query(totalBalanceQuery, [accountName, fungibleName]);

    if (!account || !rows?.length) {
      throw new Error('Account not found.');
    }

    const accountInfo = fungibleAccountValidator.validate(account);
    const totalBalance = fungibleAccountValidator.validateTotalBalance(rows[0]);
    return { ...accountInfo, totalBalance };
  }

  /**
   * Retrieves account information across specified chains for a fungible token
   *
   * @param accountName - The account name to query
   * @param fungibleName - The fungible token module name
   * @param chainIds - Optional array of chain IDs to filter results
   * @returns Array of account information per chain
   */
  // TODO: waiting for orphan blocks mechanism to be ready
  async getChainsAccountInfo(
    accountName: string,
    fungibleName: string,
    chainIds?: string[],
  ): Promise<FungibleChainAccountOutput[]> {
    let query = `
      SELECT b.id, b."chainId", b.balance, b.module, b.account as "accountName"
      FROM "Balances" b
      WHERE b.account = $1
      AND b.module = $2
    `;

    const queryParams: any[] = [accountName, fungibleName];

    if (chainIds?.length) {
      queryParams.push(chainIds);
      query += ` AND b."chainId" = ANY($3::int[])`;
    }

    const { rows } = await rootPgPool.query(query, queryParams);

    const output = rows.map(r => fungibleChainAccountValidator.validate(r));
    return output;
  }

  /**
   * Retrieves account information for all accounts associated with a public key
   *
   * @param publicKey - The public key to query accounts for
   * @param fungibleName - The fungible token module name
   * @returns Array of account information with total balances
   */
  // TODO: waiting for orphan blocks mechanism to be ready
  async getAccountsByPublicKey(
    publicKey: string,
    fungibleName: string,
  ): Promise<FungibleAccountOutput[]> {
    const publicKeyQuery = `
      SELECT p.id, p."chainId", p.account, p.module
      FROM "Guards" p
      WHERE p."publicKey" = $1
      AND p.module = $2
    `;

    const queryParams = [publicKey, fungibleName];
    const { rows } = await rootPgPool.query(publicKeyQuery, queryParams);

    const totalBalanceQuery = `
      select b.account, sum(balance) as "totalBalance"
      from "Balances" b
      WHERE b.account = ANY($1::text[])
      AND b.module = $2
      group by b.account
    `;

    const { rows: totalBalanceRows } = await rootPgPool.query(totalBalanceQuery, [
      rows.map(a => a.account),
      fungibleName,
    ]);

    const balanceMapping = totalBalanceRows.reduce(
      (acum, cur) => ({
        ...acum,
        [cur.account]: cur.totalBalance,
      }),
      {},
    );
    const output = rows.map(r => {
      return {
        ...fungibleAccountValidator.validate(r),
        totalBalance: balanceMapping[r.account],
      };
    });

    return output;
  }

  /**
   * Retrieves chain-specific account information for accounts associated with a public key
   *
   * @param publicKey - The public key to query accounts for
   * @param fungibleName - The fungible token module name
   * @param chainId - The specific chain ID to query
   * @returns Array of chain-specific account information
   */
  // TODO: waiting for orphan blocks mechanism to be ready
  async getChainAccountsByPublicKey(
    publicKey: string,
    fungibleName: string,
    chainId: string,
  ): Promise<FungibleChainAccountOutput[]> {
    const publicKeyQuery = `
      SELECT p.id, p."chainId", p.account, p.module
      FROM "Guards" p
      WHERE p."publicKey" = $1
      AND p.module = $2
      AND p."chainId" = $3
    `;

    const queryParams = [publicKey, fungibleName, chainId];
    const { rows } = await rootPgPool.query(publicKeyQuery, queryParams);

    if (rows.length === 0) return [];

    const balanceQueryParams: any = [];
    const placeholders = rows
      .map(r => ({
        chainId: r.chainId,
        module: r.module,
        account: r.account,
      }))
      .map((filter, index) => {
        balanceQueryParams.push(filter.chainId, filter.module, filter.account);
        const startIndex = index * 3 + 1;
        return `($${startIndex}, $${startIndex + 1}, $${startIndex + 2})`;
      })
      .join(', ');

    const balanceQuery = `
        SELECT
          b.id,
          b."chainId",
          b.module,
          b.account as "accountName",
          b.balance
        FROM "Balances" b
        WHERE (b."chainId", b.module, b.account) IN (${placeholders})
    `;

    const { rows: accountRows } = await rootPgPool.query(balanceQuery, balanceQueryParams);

    const output = accountRows
      .filter(r => r.hasTokenId)
      .map(r => fungibleChainAccountValidator.validate(r));
    return output;
  }

  /**
   * Retrieves non-fungible token account information for a specific account
   *
   * This method gathers information about an account's non-fungible token holdings
   * across all chains and generates a unique identifier for the account.
   *
   * @param accountName - The account name to query
   * @returns Promise resolving to non-fungible account information or null if not found
   */
  async getNonFungibleAccountInfo(accountName: string): Promise<INonFungibleAccount | null> {
    const queryParams = [accountName];
    let query = `
      SELECT b.id, b."chainId", b.balance, b."tokenId", b.account, b.module, b."hasTokenId"
      FROM "Balances" b
      WHERE b.account = $1
      AND b.module = 'marmalade-v2.ledger'
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    if (rows.length === 0) return null;

    const nonFungibleTokenBalances = rows
      .filter(r => r.hasTokenId)
      .map(row => {
        return nonFungibleTokenBalanceValidator.validate(row);
      });

    return {
      id: getNonFungibleAccountBase64ID(accountName),
      accountName,
      chainAccounts: [],
      nonFungibleTokenBalances,
    };
  }

  /**
   * Retrieves chain-specific non-fungible token account information
   *
   * This method returns information about an account's NFT holdings on
   * specific chains, creating a comprehensive overview of the account's
   * NFT presence across the Kadena network.
   *
   * @param accountName - The account name to query
   * @returns Promise resolving to an array of chain-specific NFT account information
   */
  async getNonFungibleChainAccountsInfo(accountName: string): Promise<INonFungibleChainAccount[]> {
    const queryParams = [accountName];
    const query = `
      SELECT b.id, b."chainId", b.balance, b."tokenId", b.account, b.module, b."hasTokenId"
      FROM "Balances" b
      WHERE b.account = $1
      AND b.module = 'marmalade-v2.ledger'
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    if (rows.length === 0) return [];

    const nonFungibleTokenBalances = rows
      .filter(row => row.hasTokenId)
      .map(row => {
        return nonFungibleTokenBalanceValidator.validate(row);
      });

    const output = rows.map(row => ({
      id: getNonFungibleChainAccountBase64ID(row.chainId, accountName),
      accountName,
      chainId: row.chainId,
      nonFungibleTokenBalances,
    }));

    return output;
  }

  /**
   * Retrieves non-fungible token account information for a specific account and chain
   *
   * This method provides detailed information about an account's NFT holdings on a
   * specific chain, allowing for targeted queries of NFT ownership.
   *
   * @param accountName - The account name to query
   * @param chainId - The specific chain ID to query
   * @returns Promise resolving to chain-specific NFT account information or null if not found
   */
  async getNonFungibleChainAccountInfo(
    accountName: string,
    chainId: string,
  ): Promise<INonFungibleChainAccount | null> {
    const queryParams = [accountName, chainId];
    const query = `
      SELECT b.id, b."chainId", b.balance, b."tokenId", b.account, b.module, b."hasTokenId"
      FROM "Balances" b
      WHERE b.account = $1
      AND b."chainId" = $2
      AND b.module = 'marmalade-v2.ledger'
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    if (rows.length === 0) return null;

    const nonFungibleTokenBalances = rows.map(row => {
      return nonFungibleTokenBalanceValidator.validate(row);
    });

    return {
      id: getNonFungibleChainAccountBase64ID(chainId, accountName),
      accountName,
      chainId,
      nonFungibleTokenBalances,
    };
  }

  /**
   * Retrieves information about a specific non-fungible token owned by an account
   *
   * This method provides detailed information about a specific NFT identified by its
   * token ID, including ownership and chain information.
   *
   * @param accountName - The account name that owns the NFT
   * @param chainId - The chain ID where the NFT exists
   * @param tokenId - The unique identifier of the non-fungible token
   * @returns Promise resolving to NFT balance information or null if not found
   */
  async getNonFungibleTokenBalance(
    accountName: string,
    chainId: string,
    tokenId: string,
  ): Promise<INonFungibleTokenBalance | null> {
    const queryParams = [accountName, tokenId, chainId];
    let query = `
      SELECT b.id, b."chainId", b.balance, b."tokenId", b.account, b.module, b."hasTokenId"
      FROM "Balances" b
      WHERE b.account = $1
      AND b."tokenId" = $2
      AND "chainId" = $3
      AND "hasTokenId" = true
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    if (rows.length === 0) return null;

    const output = nonFungibleTokenBalanceValidator.validate(rows[0]);

    return output;
  }

  /**
   * Retrieves account information for a specific account and fungible token directly from the blockchain node
   *
   * This method bypasses the indexed database and queries the blockchain node directly,
   * providing real-time balance information that may not yet be indexed.
   *
   * @param accountName - The account name to query
   * @param fungibleName - The fungible token module name (defaults to 'coin')
   * @returns Promise resolving to account information with total balance
   */
  async getAccountInfo_NODE(
    accountName: string,
    fungibleName = 'coin',
  ): Promise<FungibleAccountOutput | null> {
    const query = `
      SELECT DISTINCT b."chainId"
      FROM "Balances" b
      WHERE b.account = $1
      AND b.module = $2
    `;
    const { rows } = await rootPgPool.query(query, [accountName, fungibleName]);

    if (rows.length === 0) return null;

    const chainIds = rows.map(r => Number(r.chainId));

    // Query each chain directly using Pact code
    const balancePromises = chainIds.map(c => {
      const query = {
        chainId: c.toString(),
        code: `(${fungibleName}.details \"${accountName}\")`,
      };
      return handleSingleQuery(query);
    });

    const balances = (await Promise.all(balancePromises)).filter(b => b.status === 'success');
    const balancesNumber = balances.map(b => formatBalance_NODE(b));
    const totalBalance = balancesNumber.reduce((acc, cur) => acc + cur, 0);

    const accountInfo = fungibleAccountValidator.validate({
      id: -1,
      account: accountName,
      module: fungibleName,
    });

    return { ...accountInfo, totalBalance };
  }

  /**
   * Retrieves account information across specified chains for a fungible token directly from blockchain nodes
   *
   * This method queries multiple blockchain nodes to gather real-time account information
   * across different chains, bypassing the indexed database.
   *
   * @param accountName - The account name to query
   * @param fungibleName - The fungible token module name
   * @param chainIds - Optional array of chain IDs to filter results
   * @returns Promise resolving to an array of chain-specific account information
   */
  async getChainsAccountInfo_NODE(
    accountName: string,
    fungibleName: string,
    chainIds?: string[],
  ): Promise<FungibleChainAccountOutput[]> {
    let chainIdsParam = [];
    if (!chainIds?.length) {
      const query = `
        SELECT DISTINCT b."chainId"
        FROM "Balances" b
        WHERE b.account = $1
        AND b.module = $2
      `;
      const { rows } = await rootPgPool.query(query, [accountName, fungibleName]);
      const chainIds = rows.map(r => Number(r.chainId));
      chainIdsParam.push(...chainIds);
    } else {
      chainIdsParam.push(...chainIds.map(c => Number(c)));
    }

    // Query each chain directly using Pact code
    const balancePromises = chainIdsParam.map(c => {
      const query = {
        chainId: c.toString(),
        code: `(${fungibleName}.details \"${accountName}\")`,
      };
      return handleSingleQuery(query);
    });

    const rows = (await Promise.all(balancePromises)).filter(b => b.status === 'success');

    const rowsMapped = rows.map((row, index) => {
      const balance = formatBalance_NODE(row);
      const guard = formatGuard_NODE(row);
      return {
        id: index,
        accountName,
        chainId: chainIdsParam[index],
        balance: balance.toString(),
        module: fungibleName,
        guard,
      };
    });

    const output = rowsMapped.map(r => fungibleChainAccountValidator.validate(r));

    return output;
  }

  /**
   * Retrieves account information for all accounts associated with a public key directly from blockchain nodes
   *
   * This method queries guard information from blockchain nodes to identify accounts
   * controlled by a specific public key, then fetches their real-time balance information.
   *
   * @param publicKey - The public key to query accounts for
   * @param fungibleName - The fungible token module name
   * @returns Promise resolving to an array of account information with total balances
   */
  async getAccountsByPublicKey_NODE(
    publicKey: string,
    fungibleName: string,
  ): Promise<FungibleAccountOutput[]> {
    const guardsQuery = `
      SELECT g."publicKey", g."balanceId"
      FROM "Guards" g
      WHERE g."publicKey" = $1
    `;

    const { rows: guardRows } = await rootPgPool.query(guardsQuery, [publicKey]);

    if (!guardRows?.length) {
      // If no guard rows found, try with k: prefix for direct account lookup
      const params = [`k:${publicKey}`, fungibleName];
      const query = `
        SELECT b.id, b.account, b."chainId"
        FROM "Balances" b
        WHERE b.account = $1
        AND b.module = $2
      `;
      const { rows } = await rootPgPool.query(query, params);

      if (!rows.length) return [];
      return this.processAccounts(rows, fungibleName);
    } else {
      // Handle accounts associated with public key via guards
      const params = [publicKey, fungibleName];
      const query = `
        SELECT b.id, b.account, b."chainId"
        FROM "Balances" b
        JOIN "Guards" g ON b.id = g."balanceId"
        WHERE g."publicKey" = $1
        AND b.module = $2
      `;
      const { rows } = await rootPgPool.query(query, params);
      return this.processAccounts(rows, fungibleName);
    }
  }

  /**
   * Retrieves chain-specific account information for accounts associated with a public key directly from a blockchain node
   *
   * This method queries guard information for a specific chain to identify accounts controlled
   * by a public key, then fetches their real-time balance information from that chain's node.
   *
   * @param publicKey - The public key to query accounts for
   * @param fungibleName - The fungible token module name
   * @param chainId - The specific chain ID to query
   * @returns Promise resolving to an array of chain-specific account information
   */
  async getChainAccountsByPublicKey_NODE(
    publicKey: string,
    fungibleName: string,
    chainId: string,
  ): Promise<FungibleChainAccountOutput[]> {
    const guardsQuery = `
      SELECT g."publicKey", g."balanceId"
      FROM "Guards" g
      WHERE g."publicKey" = $1
    `;

    const { rows: guardRows } = await rootPgPool.query(guardsQuery, [publicKey]);

    const params = [guardRows?.length ? publicKey : `k:${publicKey}`, fungibleName, chainId];
    let query = '';
    if (!guardRows?.length) {
      // Direct account lookup with k: prefix if no guards found
      query = `
        SELECT b.id, b.account, b."chainId", b.module
        FROM "Balances" b
        WHERE b.account = $1
        AND b.module = $2
        AND b."chainId" = $3
      `;
    } else {
      // Look up via guards relation if guards exist
      query = `
        SELECT b.id, b.account, b."chainId", b.module
        FROM "Balances" b
        JOIN "Guards" g ON b.id = g."balanceId"
        WHERE g."publicKey" = $1
        AND b.module = $2
        AND b."chainId" = $3
      `;
    }

    const { rows } = await rootPgPool.query(query, params);

    // Query node directly for each balance
    const balancesWithQuery = rows.map(async r => {
      const query = {
        chainId: r.chainId.toString(),
        code: `(${fungibleName}.details \"${r.account}\")`,
      };

      return {
        id: r.id,
        accountName: r.account,
        chainId: r.chainId,
        balanceQuery: await handleSingleQuery(query),
        module: r.module,
      };
    });

    const queries = (await Promise.all(balancesWithQuery)).filter(
      b => b.balanceQuery.status === 'success',
    );

    // Format the results from node responses
    const balances = queries.map(b => {
      const balance = formatBalance_NODE(b.balanceQuery).toString();
      return {
        ...b,
        balance,
        guard: formatGuard_NODE(b.balanceQuery),
      };
    });

    const output = balances.map(r => fungibleChainAccountValidator.validate(r));
    return output;
  }

  /**
   * Retrieves token information with pagination support
   *
   * This method fetches a list of tokens (both fungible and non-fungible) with
   * support for pagination and filtering options based on specified parameters.
   *
   * @param params - Object containing filtering and pagination parameters
   * @returns Promise resolving to page info and token edges
   */
  async getTokens(params: GetTokensParams) {
    const { limit, order, after, before } = getPaginationParams(params);

    const queryParams: any[] = [limit];
    let conditions = '';

    // Handle cursor-based pagination
    if (after) {
      queryParams.push(after);
      conditions += `\WHERE id < $${queryParams.length}`;
    }

    if (before) {
      queryParams.push(before);
      conditions += `\WHERE id > $${queryParams.length}`;
    }

    // Query distinct token modules excluding the native 'coin' module
    const query = `
      WITH unique_modules AS (
        SELECT DISTINCT module, "chainId", MIN(id) as id
        FROM "Balances"
        WHERE module != 'coin'
        GROUP BY module, "chainId"
      )
      SELECT
        um.module,
        um."chainId",
        um.id
      FROM unique_modules um
      ${conditions}
      ORDER BY um.id ${order}
      LIMIT $1
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    // Format results as GraphQL connection edges
    const edges = rows.map(row => {
      return {
        cursor: row.id.toString(),
        node: {
          id: Buffer.from(`Token:[${`${row.module},${row.chainId}`}]`).toString('base64'),
          name: row.module,
          chainId: String(row.chainId),
        },
      };
    });

    const pageInfo = getPageInfo({ edges, order, limit, after, before });
    return pageInfo;
  }

  private async processAccounts(
    rows: { id: string; account: string; chainId: string }[],
    fungibleName: string,
  ): Promise<FungibleAccountOutput[]> {
    const groupedByAccount: Record<string, string[]> = rows.reduce(
      (acc, cur) => {
        if (!acc[cur.account]) {
          acc[cur.account] = [];
        }
        acc[cur.account].push(cur.chainId);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    const accountsPromises = Object.entries(groupedByAccount).map(
      async ([account, chainIds], index) => {
        const balances = chainIds.map(async c => {
          const query = {
            chainId: c.toString(),
            code: `(${fungibleName}.details \"${account}\")`,
          };
          const result = await handleSingleQuery(query);
          return formatBalance_NODE(result);
        });

        const balancesNumber = await Promise.all(balances);
        const totalBalance: Number = balancesNumber.reduce((acc, cur) => acc + cur, 0);

        const accountInfo = fungibleAccountValidator.validate({
          id: index,
          account,
          module: fungibleName,
        });
        return {
          ...accountInfo,
          totalBalance,
        };
      },
    );

    return Promise.all(accountsPromises);
  }
}
