/**
 * Specialized class for building SQL queries related to blockchain events
 *
 * This class encapsulates the complex logic for constructing SQL queries
 * to retrieve events from the database with various filtering criteria.
 */
export default class EventQueryBuilder {
  private readonly HEIGHT_BATCH_SIZE = 200;

  /**
   * Calculates the height range for block filtering based on min/max height parameters
   *
   * @param minHeight - Minimum block height to include (optional)
   * @param maxHeight - Maximum block height to include (optional)
   * @returns Object containing fromHeight and toHeight values
   */
  private calculateHeightRange(minHeight?: number | null, maxHeight?: number | null) {
    let fromHeight = 0;
    let toHeight = 0;

    if (minHeight && maxHeight) {
      fromHeight = minHeight;
      toHeight = maxHeight - minHeight > 100 ? minHeight + this.HEIGHT_BATCH_SIZE : maxHeight;
    } else if (minHeight) {
      fromHeight = minHeight;
      toHeight = minHeight + this.HEIGHT_BATCH_SIZE;
    } else if (maxHeight) {
      fromHeight = maxHeight - this.HEIGHT_BATCH_SIZE;
      toHeight = maxHeight;
    }

    const isHeightFiltered = Boolean(fromHeight || toHeight);
    return { fromHeight, toHeight, isHeightFiltered };
  }

  /**
   * Builds the SQL query for fetching events with various filtering options
   *
   * @param params - Object containing parameters needed to build the query
   * @returns Object containing the query string and parameters array
   */
  private buildEventQuery(params: {
    module: string;
    name: string;
    limit: number;
    order: string;
    after: string | null;
    before: string | null;
    blockHash?: string | null;
    chainId?: string | null;
    fromHeight: number;
    toHeight: number;
    requestKey?: string | null;
    isHeightChainOrBlockHash: boolean;
  }) {
    const {
      module,
      name,
      limit,
      order,
      after,
      before,
      blockHash,
      chainId,
      fromHeight,
      toHeight,
      requestKey,
      isHeightChainOrBlockHash,
    } = params;

    const queryParams: (string | number)[] = [limit, module, name];
    const blockQueryParams: (string | number)[] = [];
    let conditions = '';
    let eventConditions = '';

    // Process pagination parameters - keep their indices consistent for all query types
    if (after) {
      queryParams.push(after);
    }

    if (before) {
      queryParams.push(before);
    }

    // Add pagination conditions (indices need to be right)
    let idx = 3; // Starting after [limit, module, name]

    if (after) {
      idx++; // Increment to account for the 'after' parameter
      eventConditions += `\nAND e.id < $${idx}`;
    }

    if (before) {
      idx++; // Increment to account for the 'before' parameter
      eventConditions += `\nAND e.id > $${idx}`;
    }

    // Initialize a flag to track if we've added any conditions
    let hasAddedBlockCondition = false;

    if (blockHash) {
      blockQueryParams.push(blockHash);
      conditions += `WHERE b.hash = $${blockQueryParams.length + queryParams.length}`;
      hasAddedBlockCondition = true;
    }

    if (chainId) {
      blockQueryParams.push(chainId);
      if (hasAddedBlockCondition) {
        conditions += `\nAND b."chainId" = $${blockQueryParams.length + queryParams.length}`;
      } else {
        conditions += `WHERE b."chainId" = $${blockQueryParams.length + queryParams.length}`;
        hasAddedBlockCondition = true;
      }
    }

    if (fromHeight && toHeight) {
      blockQueryParams.push(fromHeight);
      if (hasAddedBlockCondition) {
        conditions += `\nAND b."height" >= $${blockQueryParams.length + queryParams.length}`;
      } else {
        conditions += `WHERE b."height" >= $${blockQueryParams.length + queryParams.length}`;
        hasAddedBlockCondition = true;
      }
      blockQueryParams.push(toHeight);
      conditions += `\nAND b."height" <= $${blockQueryParams.length + queryParams.length}`;
    }

    let query = '';
    if (isHeightChainOrBlockHash) {
      query = `
        WITH block_filtered AS (
          select *
          from "Blocks" b
          ${conditions}
        )
        SELECT
          e.id as id,
          e.requestkey as "requestKey",
          e."chainId" as "chainId",
          b.height as height,
          e."orderIndex" as "orderIndex",
          e.module as "moduleName",
          e.name as name,
          e.params as parameters,
          b.hash as "blockHash"
        FROM block_filtered b
        join "Transactions" t ON t."blockId" = b.id
        join "Events" e ON e."transactionId" = t.id
        WHERE e.module = $2
        AND e.name = $3
        ${eventConditions}
        ORDER BY b.height ${order}
        LIMIT $1
      `;
    } else if (requestKey) {
      queryParams.push(requestKey);
      query = `
        WITH event_transaction_filtered AS (
          SELECT e.*, t."blockId"
          FROM "Transactions" t
          JOIN "Events" e ON t.id = e."transactionId"
          WHERE e.module = $2
          AND e.name = $3
          AND t.requestkey = $${blockQueryParams.length + queryParams.length}
          ${eventConditions}
          ORDER BY e.id ${order}
        )
        SELECT
          et.id as id,
          et.requestkey as "requestKey",
          et."chainId" as "chainId",
          b.height as height,
          et."orderIndex" as "orderIndex",
          et.module as "moduleName",
          et.name as name,
          et.params as parameters,
          b.hash as "blockHash"
        FROM event_transaction_filtered et
        JOIN "Blocks" b ON b.id = et."blockId"
        ${conditions}
        LIMIT $1
      `;
    } else {
      query = `
        WITH event_filtered AS (
          select *
          from "Events" e
          WHERE e.module = $2
          AND e.name = $3
          ${eventConditions}
          ORDER BY e.id ${order}
        )
        SELECT
          e.id as id,
          e.requestkey as "requestKey",
          e."chainId" as "chainId",
          b.height as height,
          e."orderIndex" as "orderIndex",
          e.module as "moduleName",
          e.name as name,
          e.params as parameters,
          b.hash as "blockHash"
        FROM event_filtered e
        join "Transactions" t ON t.id = e."transactionId"
        join "Blocks" b ON b.id = t."blockId"
        ${conditions}
        LIMIT $1
      `;
    }

    return { query, queryParams: [...queryParams, ...blockQueryParams] };
  }

  /**
   * Builds a complete query for events with qualified name, handling all filtering parameters
   *
   * @param params - Object containing all query parameters and filtering options
   * @returns Object containing the query string and parameters array
   */
  buildEventsWithQualifiedNameQuery(params: {
    qualifiedEventName: string;
    limit: number;
    order: string;
    after: string | null;
    before: string | null;
    blockHash?: string | null;
    chainId?: string | null;
    minHeight?: number | null;
    maxHeight?: number | null;
    requestKey?: string | null;
  }) {
    const {
      qualifiedEventName,
      limit,
      order,
      after,
      before,
      blockHash,
      chainId,
      minHeight,
      maxHeight,
      requestKey,
    } = params;

    const splitted = qualifiedEventName.split('.');
    const name = splitted.pop() ?? '';
    const module = splitted.join('.');

    const { fromHeight, toHeight, isHeightFiltered } = this.calculateHeightRange(
      minHeight,
      maxHeight,
    );
    const isHeightChainOrBlockHash = isHeightFiltered || Boolean(blockHash || chainId);

    return this.buildEventQuery({
      module,
      name,
      limit,
      order,
      after,
      before,
      blockHash,
      chainId,
      fromHeight,
      toHeight,
      requestKey,
      isHeightChainOrBlockHash,
    });
  }
}
