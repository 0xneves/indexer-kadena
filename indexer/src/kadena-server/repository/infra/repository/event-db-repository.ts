import { rootPgPool } from "../../../../config/database";
import { PageInfo } from "../../../config/graphql-types";
import EventRepository, {
  EventOutput,
  GetBlockEventsParams,
  GetEventParams,
  GetEventsParams,
  GetTotalEventsCount,
  GetTotalTransactionEventsCount,
  GetTransactionEventsParams,
} from "../../application/event-repository";
import { getPageInfo, getPaginationParams } from "../../pagination";
import { ConnectionEdge } from "../../types";
import { eventValidator } from "../schema-validator/event-schema-validator";

export default class EventDbRepository implements EventRepository {
  async getEvent(params: GetEventParams): Promise<EventOutput> {
    const { hash, requestKey, orderIndex } = params;
    const queryParams = [hash, requestKey, orderIndex];

    const query = `
      SELECT e.id as id,
        e.name as name,
        e.requestkey as "requestKey",
        b."chainId" as "chainId",
        b.height as height,
        e."orderIndex" as "orderIndex",
        e.module as "moduleName",
        e.params as parameters,
        b.hash as "blockHash"
      FROM "Blocks" b
      JOIN "Transactions" t ON b.id = t."blockId"
      JOIN "Events" e ON t.id = e."transactionId"
      WHERE b.hash = $1
      AND e.requestkey = $2
      AND e."orderIndex" = $3
      LIMIT 1;
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    const output = eventValidator.validate(rows[0]);
    return output;
  }
  async getBlockEvents(params: GetBlockEventsParams) {
    const { hash, after, before, first, last } = params;
    const { limit, order } = getPaginationParams({
      after,
      before,
      first,
      last,
    });

    const queryParams = [limit, hash];

    let conditions = "";

    if (before) {
      queryParams.push(before);
      conditions += `\nAND e.id < $3`;
    }

    if (after) {
      queryParams.push(after);
      conditions += `\nAND e.id > $3`;
    }

    const query = `
      SELECT e.id as id,
        e.name as name,
        e.requestkey as "requestKey",
        b."chainId" as "chainId",
        b.height as height,
        e."orderIndex" as "orderIndex",
        e.module as "moduleName",
        e.params as parameters,
        b.hash as "blockHash"
      FROM "Blocks" b
      JOIN "Transactions" t ON b.id = t."blockId"
      JOIN "Events" e ON t.id = e."transactionId"
      WHERE b.hash = $2
      ${conditions}
      ORDER BY e.id ${order}
      LIMIT $1;
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    const edges = rows.map((row) => ({
      cursor: row.id.toString(),
      node: eventValidator.validate(row),
    }));

    const pageInfo = getPageInfo({ rows: edges, first, last });

    return {
      edges,
      pageInfo,
    };
  }

  async getTotalCountOfBlockEvents(hash: string): Promise<number> {
    const totalCountQuery = `
      SELECT COUNT(*) as count
      FROM "Blocks" b
      JOIN "Transactions" t ON b.id = t."blockId"
      JOIN "Events" e ON t.id = e."transactionId"
      WHERE b.hash = $1
    `;

    const { rows: countResult } = await rootPgPool.query(totalCountQuery, [
      hash,
    ]);

    const totalCount = parseInt(countResult[0].count, 10);
    return totalCount;
  }

  async getEventsWithQualifiedName(params: GetEventsParams) {
    const {
      qualifiedEventName,
      blockHash,
      chainId,
      after,
      before,
      first,
      last,
      minHeight,
      maxHeight,
      minimumDepth,
      requestKey,
    } = params;

    const { limit, order } = getPaginationParams({
      after,
      before,
      first,
      last,
    });

    const splitted = qualifiedEventName.split(".");
    const name = splitted.pop() ?? "";
    const module = splitted.join(".");

    const queryParams: (string | number)[] = [limit];
    let conditions = "";

    queryParams.push(module);
    conditions += `WHERE e.module = $${queryParams.length}`;
    queryParams.push(name);
    conditions += `\nAND e.name = $${queryParams.length}`;

    if (blockHash) {
      queryParams.push(blockHash);
      conditions += `\nAND b.hash = $${queryParams.length}`;
    }

    if (chainId) {
      queryParams.push(chainId);
      conditions += `\nAND b."chainId" = $${queryParams.length}`;
    }

    if (minHeight) {
      queryParams.push(minHeight);
      conditions += `\nAND b."height" >= $${queryParams.length}`;
    }

    if (maxHeight) {
      queryParams.push(maxHeight);
      conditions += `\nAND b."height" <= $${queryParams.length}`;
    }

    if (minimumDepth) {
      queryParams.push(minimumDepth);
      conditions += `\nAND b."height" <= $${queryParams.length}`;
    }

    if (requestKey) {
      queryParams.push(requestKey);
      conditions += `\nAND t."requestkey" = $${queryParams.length}`;
    }

    if (before) {
      queryParams.push(before);
      conditions += `\nAND e.id < $${queryParams.length}`;
    }

    if (after) {
      queryParams.push(after);
      conditions += `\nAND e.id > $${queryParams.length}`;
    }

    const query = `
      select e.id as id,
        t.requestkey as "requestKey",
        b."chainId" as "chainId",
        b.height as height,
        e."orderIndex" as "orderIndex",
        e.module as "moduleName",
        e.name as name,
        e.params as parameters,
        b.hash as "blockHash"
      from "Events" e
      join "Transactions" t on e."transactionId" = t.id 
      join "Blocks" b on b.id = t."blockId"
      ${conditions}
      ORDER BY id ${order}
      LIMIT $1
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    const edges = rows.map((row) => ({
      cursor: row.id.toString(),
      node: eventValidator.validate(row),
    }));

    const pageInfo = getPageInfo({ rows: edges, first, last });

    return {
      edges,
      pageInfo,
    };
  }

  async getTotalEventsCount(params: GetTotalEventsCount): Promise<number> {
    const {
      qualifiedEventName,
      blockHash,
      chainId,
      minHeight,
      maxHeight,
      minimumDepth,
      requestKey,
    } = params;

    const splitted = qualifiedEventName.split(".");
    const name = splitted.pop() ?? "";
    const module = splitted.join(".");

    const queryParams: (string | number)[] = [];
    let conditions = "";

    queryParams.push(module);
    conditions += `WHERE e.module = $${queryParams.length}`;
    queryParams.push(name);
    conditions += `\nAND e.name = $${queryParams.length}`;

    if (blockHash) {
      queryParams.push(blockHash);
      conditions += `\nAND b.hash = $${queryParams.length}`;
    }

    if (chainId) {
      queryParams.push(chainId);
      conditions += `\nAND b."chainId" = $${queryParams.length}`;
    }

    if (minHeight) {
      queryParams.push(minHeight);
      conditions += `\nAND b."height" >= $${queryParams.length}`;
    }

    if (maxHeight) {
      queryParams.push(maxHeight);
      conditions += `\nAND b."height" <= $${queryParams.length}`;
    }

    if (minimumDepth) {
      queryParams.push(minimumDepth);
      conditions += `\nAND b."height" <= $${queryParams.length}`;
    }

    if (requestKey) {
      queryParams.push(requestKey);
      conditions += `\nAND t.requestkey = $${queryParams.length}`;
    }

    const totalCountQuery = `
      select count (*) as count
      from "Events" e
      join "Transactions" t on e."transactionId" = t.id 
      join "Blocks" b on b.id = t."blockId"
      ${conditions}
    `;

    const { rows: countResult } = await rootPgPool.query(
      totalCountQuery,
      queryParams,
    );
    const totalCount = parseInt(countResult[0].count, 10);
    return totalCount;
  }

  async getTransactionEvents(
    params: GetTransactionEventsParams,
  ): Promise<{ pageInfo: PageInfo; edges: ConnectionEdge<EventOutput>[] }> {
    const { transactionId, after, before, first, last } = params;
    const { limit, order } = getPaginationParams({
      after,
      before,
      first,
      last,
    });

    const queryParams: (string | number)[] = [limit, transactionId];
    let conditions = "";

    if (after) {
      queryParams.push(after);
      conditions += `\nAND e.id > $3`;
    }

    if (before) {
      queryParams.push(before);
      conditions += `\nAND e.id < $3`;
    }

    const query = `
      select e.id as id,
        e.requestkey as "requestKey",
        b."chainId" as "chainId",
        b.height as height,
        e.module as "moduleName",
        e."orderIndex" as "orderIndex",
        e.name as name,
        e.params as parameters,
        b.hash as "blockHash"
      from "Events" e
      join "Transactions" t on e."transactionId" = t.id 
      join "Blocks" b on b.id = t."blockId"
      where t.id = $2
      ${conditions}
      ORDER BY id ${order}
      LIMIT $1
    `;

    const { rows } = await rootPgPool.query(query, queryParams);

    const edges = rows.map((row) => ({
      cursor: row.id.toString(),
      node: eventValidator.validate(row),
    }));

    const pageInfo = getPageInfo({ rows: edges, first, last });

    return {
      edges,
      pageInfo,
    };
  }

  async getTotalTransactionEventsCount(params: GetTotalTransactionEventsCount) {
    const { transactionId } = params;

    const queryParams: (string | number)[] = [transactionId];

    const totalCountQuery = `
      SELECT t.num_events as count
      FROM "Transactions" t
      WHERE t.id = $1
    `;

    const { rows: countResult } = await rootPgPool.query(
      totalCountQuery,
      queryParams,
    );
    const totalCount = parseInt(countResult[0].count, 10);
    return totalCount;
  }
}
