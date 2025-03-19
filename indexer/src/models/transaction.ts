import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Block from './block';
import { gql, makeExtendSchemaPlugin } from 'postgraphile';
import { TransactionDetailsAttributes } from './transaction-details';

export interface TransactionAttributes {
  id: number;
  blockId: number;
  chainId: number;
  creationtime: string;
  hash: string;
  result: object;
  logs: string;
  num_events: number;
  requestkey: string;
  sender: string;
  txid: string;
  canonical?: boolean;
}

export interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id'> {}

/**
 * Represents a transaction in the blockchain.
 */
class Transaction
  extends Model<TransactionAttributes, TransactionCreationAttributes>
  implements TransactionAttributes
{
  /** The unique identifier for the transaction record (e.g., 53411). */
  declare id: number;

  /** The ID of the associated block (e.g., 40515). */
  declare blockId: number;

  /** The result of the transaction (e.g., {"data": "Write succeeded", "status": "success"}). */
  declare result: object;

  /** The ID of the blockchain network (e.g., 0). */
  declare chainId: number;

  /** The creation time of the transaction (e.g., "1715747797"). */
  declare creationtime: string;

  /** The hash of the transaction (e.g., "S7v5RXHKgYAWAsnRfYWU_SUh6Jc4g4TU2HOEALj_JSU"). */
  declare hash: string;

  /** The logs generated by the transaction (e.g., "XGZIbkOVNtZkqzi1c2dUP-rrnwG0qALO-EVPXTZhV2I"). */
  declare logs: string;

  /** The number of events generated by the transaction (e.g., 1). */
  declare num_events: number;

  /** The request key of the transaction (e.g., "S7v5RXHKgYAWAsnRfYWU_SUh6Jc4g4TU2HOEALj_JSU"). */
  declare requestkey: string;

  /** The sender of the transaction (e.g., "k:5c54af27ee3d53273bb7b7af9bfba9567e01bff4fbe70da3ee3a57b6d454dbd2"). */
  declare sender: string;

  /** The transaction ID (e.g., "309297606"). */
  declare txid: string;

  /** Indicates whether the transaction is canonical. */
  declare canonical?: boolean;

  /** The associated block. */
  declare block: Block;
}

Transaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'The unique identifier for the transaction record (e.g., 53411).',
    },
    blockId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'The ID of the associated block (e.g., 40515).',
    },
    chainId: {
      type: DataTypes.INTEGER,
      comment: 'The ID of the blockchain network (e.g., 0).',
    },
    creationtime: {
      type: DataTypes.STRING,
      comment: "The creation time of the transaction (e.g., '1715747797').",
    },
    hash: {
      type: DataTypes.STRING,
      comment: "The hash of the transaction (e.g., 'S7v5RXHKgYAWAsnRfYWU_SUh6Jc4g4TU2HOEALj_JSU').",
    },
    result: {
      type: DataTypes.JSONB,
      comment:
        "The result of the transaction (e.g., {'data': 'Write succeeded', 'status': 'success'}).",
    },
    logs: {
      type: DataTypes.STRING,
      comment:
        "The logs generated by the transaction (e.g., 'XGZIbkOVNtZkqzi1c2dUP-rrnwG0qALO-EVPXTZhV2I').",
    },
    num_events: {
      type: DataTypes.INTEGER,
      comment: 'The number of events generated by the transaction (e.g., 1).',
    },
    requestkey: {
      type: DataTypes.STRING,
      comment:
        "The request key of the transaction (e.g., 'S7v5RXHKgYAWAsnRfYWU_SUh6Jc4g4TU2HOEALj_JSU').",
    },
    sender: {
      type: DataTypes.STRING,
      comment:
        "The sender of the transaction (e.g., 'k:5c54af27ee3d53273bb7b7af9bfba9567e01bff4fbe70da3ee3a57b6d454dbd2').",
    },
    txid: {
      type: DataTypes.STRING,
      comment: "The transaction ID (e.g., '309297606').",
    },
    canonical: {
      type: DataTypes.BOOLEAN,
      comment: 'Indicates whether the transaction is canonical.',
    },
  },
  {
    sequelize,
    modelName: 'Transaction',
    indexes: [
      {
        name: 'transactions_requestkey_idx',
        fields: ['requestkey'],
      },
      {
        name: 'transactions_blockId_idx',
        fields: ['blockId'],
      },
      {
        name: 'transactions_sender_idx',
        fields: ['sender'],
      },
      {
        name: 'transactions_chainId_idx',
        fields: ['chainId'],
      },
      {
        name: 'transactions_chainid_blockid_idx',
        fields: ['chainId', 'blockId'],
      },
      {
        name: 'transactions_hash_idx',
        fields: ['hash'],
      },
      {
        name: 'transactions_canonical_idx',
        fields: ['canonical'],
      },
      {
        name: 'transactions_sender_id_idx',
        fields: ['sender', 'id'],
      },
      // Search indexes
      {
        name: 'transactions_trgm_requestkey_idx',
        fields: [sequelize.fn('LOWER', sequelize.col('requestkey'))],
        using: 'gin',
        operator: 'gin_trgm_ops',
      },
      {
        name: 'transactions_trgm_hash_idx',
        fields: [sequelize.fn('LOWER', sequelize.col('hash'))],
        using: 'gin',
        operator: 'gin_trgm_ops',
      },
      {
        name: 'transactions_trgm_txid_idx',
        fields: [sequelize.fn('LOWER', sequelize.col('txid'))],
        using: 'gin',
        operator: 'gin_trgm_ops',
      },
      {
        name: 'transactions_trgm_sender_idx',
        fields: [sequelize.fn('LOWER', sequelize.col('sender'))],
        using: 'gin',
        operator: 'gin_trgm_ops',
      },
    ],
  },
);

Transaction.belongsTo(Block, {
  foreignKey: 'blockId',
});

export interface Transaction_ {
  cmd: TransactionCommand;
  hash: string;
  id: number;
  result: TransactionInfo;
  // sigs: TransactionSignature[];
}

export interface TransactionCommand {
  meta: TransactionMeta;
  networkId: string;
  nonce: string;
  payload: TransactionPayload;
  signers: Signer[];
}

export interface TransactionMeta {
  chainId: BigInt;
  creationTime: Date;
  gasLimit: BigInt;
  gasPrice: number;
  sender: string;
  ttl: BigInt;
}

export interface TransactionSignature {
  sig: string;
}

export interface TransactionMempoolInfo {
  status: string;
}

export type TransactionInfo = TransactionMempoolInfo | TransactionResult;

export type TransactionPayload = ContinuationPayload | ExecutionPayload;

export interface ContinuationPayload {
  data: string;
  pactId: string;
  proof: string;
  rollback: boolean;
  step: number;
}

export interface ExecutionPayload {
  code: string;
  data: string;
}

export interface TransactionResult {
  badResult: string;
  block: Block_ | null;
  continuation: string;
  eventCount: BigInt;
  events: TransactionResultEventsConnection | null;
  gas: BigInt;
  goodResult: string;
  height: BigInt;
  logs: string;
  transactionId: BigInt;
  transfers: TransactionResultTransfersConnection | null;
}

export interface Signer {
  address: string;
  clist: TransactionCapability[];
  id: number;
  orderIndex: number;
  pubkey: string;
  scheme: string;
}

export interface TransactionCapability {
  args: string;
  name: string;
}

export interface TransactionResultEventsConnection {
  edges: TransactionResultEventsConnectionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface TransactionResultEventsConnectionEdge {
  cursor: string;
  node: Event_;
}

export interface Event_ {
  block: Block_;
  chainId: BigInt;
  height: BigInt;
  id: number;
  incrementedId: number;
  moduleName: string;
  name: string;
  orderIndex: BigInt;
  parameterText: string;
  parameters: string;
  qualifiedName: string;
  requestKey: string;
  transaction: Transaction_;
}

export interface TransactionResultTransfersConnection {
  edges: TransactionResultTransfersConnectionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface TransactionResultTransfersConnectionEdge {
  cursor: string;
  node: Transfer_;
}

export interface Transfer_ {
  amount: number;
  block: Block_;
  blockHash: string;
  chainId: BigInt;
  creationTime: Date;
  crossChainTransfer: Transfer_;
  height: BigInt;
  id: number;
  moduleHash: string;
  moduleName: string;
  orderIndex: BigInt;
  receiverAccount: string;
  requestKey: string;
  senderAccount: string;
  transaction: Transaction_;
}

export interface Block_ {
  chainId: BigInt;
  creationTime: Date;
  difficulty: BigInt;
  epoch: Date;
  events: BlockEventsConnection;
  flags: number;
  hash: string;
  height: BigInt;
  id: number;
  minerAccount: FungibleChainAccount;
  neighbors: BlockNeighbor[];
  nonce: number;
  parent: Block_;
  payloadHash: string;
  powHash: string;
  target: number;
  transactions: BlockTransactionsConnection;
  weight: number;
}

export interface BlockEventsConnection {
  edges: BlockEventsConnectionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface BlockEventsConnectionEdge {
  cursor: string;
  node: Event_;
}

export interface FungibleChainAccount {
  accountName: string;
  balance: number;
  chainId: string;
  fungibleName: string;
  guard: Guard;
  id: number;
  transactions: FungibleChainAccountTransactionsConnection;
  transfers: FungibleChainAccountTransfersConnection;
}

export interface FungibleChainAccountTransactionsConnection {
  edges: FungibleChainAccountTransactionsConnectionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FungibleChainAccountTransactionsConnectionEdge {
  cursor: string;
  node: Transaction_;
}

export interface FungibleChainAccountTransfersConnection {
  edges: FungibleChainAccountTransfersConnectionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FungibleChainAccountTransfersConnectionEdge {
  cursor: string;
  node: Transfer_;
}

export interface Guard {
  keys: string[];
  predicate: string;
}

export interface BlockNeighbor {
  chainId: string;
  hash: string;
}

export interface BlockTransactionsConnection {
  edges: BlockTransactionsConnectionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface BlockTransactionsConnectionEdge {
  cursor: string;
  node: Transaction_;
}

export interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
}

export const kadenaExtensionPlugin = makeExtendSchemaPlugin(build => {
  return {
    typeDefs: gql`
      extend type Query {
        transaction_(requestkey: String!): Transaction_
      }

      type Transaction_ {
        cmd: TransactionCommand!
        hash: String!
        id: ID!
        result: TransactionInfo!
      }

      type TransactionCommand {
        meta: TransactionMeta!
        networkId: String!
        nonce: String!
        payload: TransactionPayload!
        signers: [Signer!]!
      }

      type TransactionMeta {
        chainId: BigInt!
        creationTime: Datetime!
        gasLimit: BigInt!
        gasPrice: Float!
        sender: String!
        ttl: BigInt!
      }

      type TransactionSignature {
        sig: String!
      }

      type TransactionMempoolInfo {
        status: String
      }

      union TransactionInfo = TransactionMempoolInfo | TransactionResult
      union TransactionPayload = ContinuationPayload | ExecutionPayload

      type ContinuationPayload {
        data: String!
        pactId: String
        proof: String
        rollback: Boolean
        step: Int
      }

      type ExecutionPayload {
        code: String
        data: String!
      }

      type TransactionResult {
        badResult: String
        block: Block_!
        continuation: String
        eventCount: BigInt
        events(
          after: String
          before: String
          first: Int
          last: Int
        ): TransactionResultEventsConnection!
        gas: BigInt!
        goodResult: String
        height: BigInt!
        logs: String
        transactionId: BigInt
        transfers(
          after: String
          before: String
          first: Int
          last: Int
        ): TransactionResultTransfersConnection!
      }

      type Signer {
        address: String
        clist: [TransactionCapability!]!
        id: ID!
        orderIndex: Int
        pubkey: String!
        scheme: String
      }

      type TransactionCapability {
        args: String!
        name: String!
      }

      type TransactionResultEventsConnection {
        edges: [TransactionResultEventsConnectionEdge]!
        pageInfo: PageInfo!
        totalCount: Int!
      }

      type TransactionResultEventsConnectionEdge {
        cursor: String!
        node: Event_!
      }

      type Event_ {
        block: Block_!
        chainId: BigInt!
        height: BigInt!
        id: ID!
        incrementedId: Int!
        moduleName: String!
        name: String!
        orderIndex: BigInt!
        parameterText: String!
        parameters: String
        qualifiedName: String!
        requestKey: String!
        transaction: Transaction_
      }

      type TransactionResultTransfersConnection {
        edges: [TransactionResultTransfersConnectionEdge]!
        pageInfo: PageInfo!
        totalCount: Int!
      }

      type TransactionResultTransfersConnectionEdge {
        cursor: String!
        node: Transfer_!
      }

      type Transfer_ {
        amount: BigFloat!
        block: Block_!
        blockHash: String!
        chainId: BigInt!
        creationTime: Datetime!
        crossChainTransfer: Transfer_
        height: BigInt!
        id: ID!
        moduleHash: String!
        moduleName: String!
        orderIndex: BigInt!
        receiverAccount: String!
        requestKey: String!
        senderAccount: String!
        transaction: Transaction_
      }

      type Block_ {
        chainId: BigInt!
        creationTime: Datetime!
        difficulty: BigInt!
        epoch: Datetime!
        events(after: String, before: String, first: Int, last: Int): BlockEventsConnection!
        flags: BigFloat!
        hash: String!
        height: BigInt!
        id: ID!
        minerAccount: FungibleChainAccount!
        neighbors: [BlockNeighbor!]!
        nonce: BigFloat!
        parent: Block_
        payloadHash: String!
        powHash: String!
        target: BigFloat!
        transactions(
          after: String
          before: String
          first: Int
          last: Int
        ): BlockTransactionsConnection!
        weight: BigFloat!
      }

      type BlockEventsConnection {
        edges: [BlockEventsConnectionEdge!]!
        pageInfo: PageInfo!
        totalCount: Int!
      }

      type BlockEventsConnectionEdge {
        cursor: String!
        node: Event_!
      }

      type FungibleChainAccount {
        accountName: String!
        balance: Float!
        chainId: String!
        fungibleName: String!
        guard: Guard!
        id: ID!
        transactions(
          after: String
          before: String
          first: Int
          last: Int
        ): FungibleChainAccountTransactionsConnection!
        transfers(
          after: String
          before: String
          first: Int
          last: Int
        ): FungibleChainAccountTransfersConnection!
      }

      type FungibleChainAccountTransactionsConnection {
        edges: [FungibleChainAccountTransactionsConnectionEdge!]!
        pageInfo: PageInfo!
        totalCount: Int!
      }

      type FungibleChainAccountTransactionsConnectionEdge {
        cursor: String!
        node: Transaction_!
      }

      type FungibleChainAccountTransfersConnection {
        edges: [FungibleChainAccountTransfersConnectionEdge!]!
        pageInfo: PageInfo!
        totalCount: Int!
      }

      type FungibleChainAccountTransfersConnectionEdge {
        cursor: String!
        node: Transfer_!
      }

      type Guard {
        keys: [String!]!
        predicate: String!
      }

      type BlockNeighbor {
        chainId: String!
        hash: String!
      }

      type BlockTransactionsConnection {
        edges: [BlockTransactionsConnectionEdge!]!
        pageInfo: PageInfo!
        totalCount: Int!
      }

      type BlockTransactionsConnectionEdge {
        cursor: String!
        node: Transaction_!
      }
    `,
    resolvers: {
      TransactionPayload: {
        __resolveType(obj) {
          if (obj.code) {
            return 'ExecutionPayload';
          }
          return 'ContinuationPayload';
        },
      },
      Query: {
        transaction_: async (_query, args, context, resolveInfo) => {
          const { requestkey } = args;
          const { rootPgPool } = context;

          const { rows: transactions } = await rootPgPool.query(
            `SELECT t.*, td.* FROM public."Transactions" t LEFT JOIN public."TransactionDetails" td ON t.id = td."transactionId" WHERE t.requestkey = $1`,
            [requestkey],
          );

          var results: Array<Transaction_> = [];

          transactions.forEach(
            (transaction: TransactionAttributes & TransactionDetailsAttributes) => {
              results.push({
                cmd: {
                  meta: {
                    chainId: BigInt(transaction.chainId),
                    creationTime: new Date(parseInt(transaction.creationtime) * 1000),
                    gasLimit: BigInt(transaction.gaslimit),
                    gasPrice: parseFloat(transaction.gasprice),
                    sender: transaction.sender,
                    ttl: BigInt(transaction.ttl),
                  },
                  networkId: transaction.chainId ? transaction.chainId.toString() : '',
                  nonce: transaction.nonce,
                  payload:
                    transaction.continuation.toString() == ''
                      ? ({
                          code: transaction.code ? transaction.code.toString() : '',
                          data: JSON.stringify(transaction.data),
                        } as ExecutionPayload)
                      : ({
                          data: JSON.stringify(transaction.data),
                          pactId: transaction.pactid,
                          proof: transaction.proof,
                          rollback: transaction.rollback,
                          step: transaction.step,
                        } as ContinuationPayload),
                  signers: [],
                },
                hash: transaction.hash,
                id: transaction.id,
                result: {
                  badResult: transaction.rollback ? transaction.result.toString() : '',
                  block: null,
                  continuation: transaction.continuation ? transaction.continuation.toString() : '',
                  eventCount: BigInt(transaction.num_events),
                  events: null,
                  gas: BigInt(transaction.gas),
                  goodResult: transaction.rollback ? '' : transaction.result.toString(),
                  height: BigInt(0),
                  logs: transaction.logs ? transaction.logs.toString() : '',
                  transactionId: BigInt(transaction.id),
                  transfers: null,
                },
              });
            },
          );

          if (results.length > 0) {
            console.log(results[0]);
            return results[0];
          } else {
            return null;
          }
        },
      },
    },
  };
});

export const transactionByRequestKeyQueryPlugin = makeExtendSchemaPlugin(build => {
  return {
    typeDefs: gql`
      extend type Query {
        transactionByRequestKey(
          requestkey: String!
          eventLimit: Int
          transferLimit: Int
        ): TransactionData
      }

      type TransactionData {
        transaction: Transaction
        events: [Event]
        transfers: [TransferData]
      }

      type TransferData {
        transfer: Transfer
        contract: Contract
      }
    `,
    resolvers: {
      Query: {
        transactionByRequestKey: async (_query, args, context, resolveInfo) => {
          const { requestkey, eventLimit, transferLimit } = args;
          const { rootPgPool } = context;

          const { rows: transactions } = await rootPgPool.query(
            `SELECT * FROM public."Transactions" WHERE requestkey = $1`,
            [requestkey],
          );

          if (transactions.length === 0) {
            return null;
          }

          const transaction = transactions[0];

          const eventLimitClause = eventLimit ? `LIMIT $2` : '';
          const eventQueryParams = eventLimit ? [transaction.id, eventLimit] : [transaction.id];
          const { rows: events } = await rootPgPool.query(
            `SELECT * FROM public."Events" WHERE "transactionId" = $1 ${eventLimitClause}`,
            eventQueryParams,
          );

          const transferLimitClause = transferLimit ? `LIMIT $2` : '';
          const transferQueryParams = transferLimit
            ? [transaction.id, transferLimit]
            : [transaction.id];
          const { rows: transfers } = await rootPgPool.query(
            `SELECT * FROM public."Transfers" WHERE "transactionId" = $1 ${transferLimitClause}`,
            transferQueryParams,
          );

          const transferDataPromises = transfers.map(async (transfer: any) => {
            let contract = null;
            transfer.toAcct = transfer.to_acct;
            transfer.fromAcct = transfer.from_acct;
            if (transfer.contractId) {
              const { rows: contracts } = await rootPgPool.query(
                `SELECT * FROM public."Contracts" WHERE id = $1`,
                [transfer.contractId],
              );
              contract = contracts.length > 0 ? contracts[0] : null;
            }

            return {
              transfer,
              contract,
            };
          });

          const transferData = await Promise.all(transferDataPromises);

          transaction.numEvents = events.length;

          return {
            transaction,
            events,
            transfers: transferData,
          };
        },
      },
    },
  };
});

export const transactionsByBlockIdQueryPlugin = makeExtendSchemaPlugin(build => {
  return {
    typeDefs: gql`
      extend type Query {
        transactionsByBlockId(blockId: Int!, first: Int, after: String): TransactionConnection
      }

      type TransactionConnection {
        edges: [TransactionEdge]
        pageInfo: PageInfo
      }

      type TransactionEdge {
        node: Transaction
        cursor: String
      }
    `,
    resolvers: {
      Query: {
        transactionsByBlockId: async (_query, args, context, resolveInfo) => {
          const { blockId, first, after } = args;
          const { rootPgPool } = context;

          let cursorCondition = '';
          const limit = first || 10;
          const values = [blockId, limit + 1];

          if (after) {
            cursorCondition = 'AND id > $3';
            values.push(Buffer.from(after, 'base64').toString('ascii'));
          }

          const query = `
            SELECT * FROM public."Transactions"
            WHERE "blockId" = $1
            ${cursorCondition}
            ORDER BY id
            LIMIT $2
          `;

          const { rows } = await rootPgPool.query(query, values);

          const hasNextPage = rows.length > limit;
          if (hasNextPage) {
            rows.pop();
          }

          const edges = rows.map((row: any) => ({
            node: row,
            cursor: Buffer.from(row.id.toString(), 'ascii').toString('base64'),
          }));

          const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

          return {
            edges,
            pageInfo: {
              endCursor,
              hasNextPage,
            },
          };
        },
      },
    },
  };
});

export default Transaction;
