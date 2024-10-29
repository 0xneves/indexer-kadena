import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";
import Transaction from "./transaction";
import Contract from "./contract";
import { gql, makeExtendSchemaPlugin } from "postgraphile";

export interface TransferAttributes {
  id: number;
  transactionId: number;
  type: string;
  amount: number;
  payloadHash: string;
  chainId: number;
  from_acct: string;
  modulehash: string;
  modulename: string;
  requestkey: string;
  to_acct: string;
  network: string;
  hasTokenId: boolean;
  tokenId?: string;
  contractId?: number;
  canonical?: boolean;
}

/**
 * Represents a token transfer in the blockchain.
 */
class Transfer extends Model<TransferAttributes> implements TransferAttributes {
  /** The unique identifier for the transfer record (e.g., 1799984). */
  declare id: number;

  /** The ID of the associated transaction (e.g., 2022215). */
  declare transactionId: number;

  /** The type of the transfer (e.g., "fungible"). */
  declare type: string;

  /** The amount transferred (e.g., 0.0003112). */
  declare amount: number;

  /** The payload hash of the transfer (e.g., "UVboyJrggtoJBUSgCvTfCMrfGjxiZ7tvRQ_k_f5Mr6I"). */
  declare payloadHash: string;

  /** The ID of the blockchain network (e.g., 0). */
  declare chainId: number;

  /** The account from which the transfer was made (e.g., "k:6fdc4bdbd5bd319466d7b83d85465d8a5a5546bf3b9aababb77aac7bb44241aa"). */
  declare from_acct: string;

  /** The hash of the module (e.g., "klFkrLfpyLW-M3xjVPSdqXEMgxPPJibRt_D6qiBws6s"). */
  declare modulehash: string;

  /** The name of the module (e.g., "coin"). */
  declare modulename: string;

  /** The request key of the transfer (e.g., "y2XuhnGPkvptF-scYTnMfdcD2zokQf-HyOu-qngAm9s"). */
  declare requestkey: string;

  /** The account to which the transfer was made (e.g., "k:251efb06f3b798dbe7bb3f58f535b67b0a9ed2da9aa4e2367be4abc07cc927fa"). */
  declare to_acct: string;

  /** The network name (e.g., "mainnet01"). */
  declare network: string;

  /** Whether the transfer has a token ID (e.g., false). */
  declare hasTokenId: boolean;

  /** The token ID associated with the transfer (optional, e.g., "t:DowR5LB9h6n96kxFRXDLSuSs1yh100Pk6STuUQNpseM"). */
  declare tokenId?: string;

  /** The ID of the associated contract (optional, e.g., 1). */
  declare contractId?: number;

  /* Whether the transfer is canonical */
  declare canonical?: boolean;
}

Transfer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, comment: "The unique identifier for the transfer record (e.g., 1799984)." },
    transactionId: { type: DataTypes.INTEGER, allowNull: true, comment: "The ID of the associated transaction (e.g., 2022215)." },
    type: { type: DataTypes.STRING, allowNull: false, comment: "The type of the transfer (e.g., 'fungible')." },
    amount: { type: DataTypes.DECIMAL, allowNull: false, comment: "The amount transferred (e.g., 0.0003112)." },
    payloadHash: { type: DataTypes.STRING, allowNull: false, comment: "The payload hash of the transfer (e.g., 'UVboyJrggtoJBUSgCvTfCMrfGjxiZ7tvRQ_k_f5Mr6I')." },
    chainId: { type: DataTypes.INTEGER, allowNull: false, comment: "The ID of the blockchain network (e.g., 0)." },
    from_acct: { type: DataTypes.STRING, allowNull: false, comment: "The account from which the transfer was made (e.g., 'k:6fdc4bdbd5bd319466d7b83d85465d8a5a5546bf3b9aababb77aac7bb44241aa')." },
    modulehash: { type: DataTypes.STRING, allowNull: false, comment: "The hash of the module (e.g., 'klFkrLfpyLW-M3xjVPSdqXEMgxPPJibRt_D6qiBws6s')." },
    modulename: { type: DataTypes.STRING, allowNull: false, comment: "The name of the module (e.g., 'coin')." },
    requestkey: { type: DataTypes.STRING, allowNull: false, comment: "The request key of the transfer (e.g., 'y2XuhnGPkvptF-scYTnMfdcD2zokQf-HyOu-qngAm9s')." },
    to_acct: { type: DataTypes.STRING, allowNull: false, comment: "The account to which the transfer was made (e.g., 'k:251efb06f3b798dbe7bb3f58f535b67b0a9ed2da9aa4e2367be4abc07cc927fa')." },
    network: { type: DataTypes.STRING, allowNull: false, comment: "The network name (e.g., 'mainnet01')." },
    hasTokenId: { type: DataTypes.BOOLEAN, allowNull: true, comment: "Whether the transfer has a token ID (e.g., true)." },
    tokenId: { type: DataTypes.STRING, allowNull: true, comment: "The token ID associated with the transfer (optional, e.g., 't:DowR5LB9h6n96kxFRXDLSuSs1yh100Pk6STuUQNpseM')." },
    contractId: { type: DataTypes.INTEGER, allowNull: true, comment: "The ID of the associated contract (optional, e.g., 1)." },
    canonical: { type: DataTypes.BOOLEAN, allowNull: true, comment: "Whether the transfer is canonical" },
  },
  {
    sequelize,
    modelName: "Transfer",
    indexes: [
      {
        name: "transfers_type_idx",
        fields: ["type"],
      },
      {
        name: "transfers_transactionid_idx",
        fields: ["transactionId"],
      },
      {
        name: "transfers_hasTokenId_idx",
        fields: ["hasTokenId"],
      },
      {
        name: "transfers_contractid_idx",
        fields: ["contractId"],
      },
      {
        name: "transfers_modulename_idx",
        fields: ["modulename"],
      },
    ],
  }
);

Transfer.belongsTo(Transaction, {
  foreignKey: "transactionId",
  as: "transaction",
});

Transfer.belongsTo(Contract, {
  foreignKey: "contractId",
  as: "contract",
});

export const transfersByTypeQueryPlugin = makeExtendSchemaPlugin((build) => {
  return {
    typeDefs: gql`
      extend type Query {
        transfersByType(
          type: String!
          first: Int
          after: String
        ): TransferConnection
      }

      type TransferConnection {
        edges: [TransferEdge]
        pageInfo: PageInfo
      }

      type TransferEdge {
        node: Transfer
        cursor: String
      }
    `,
    resolvers: {
      Query: {
        transfersByType: async (_query, args, context, resolveInfo) => {
          const { type, first, after } = args;
          const { rootPgPool } = context;

          let cursorCondition = "";
          const limit = first || 10;
          const values = [type, limit + 1];

          if (after) {
            cursorCondition = "AND id > $3";
            values.push(Buffer.from(after, "base64").toString("ascii"));
          }

          const query = `
            SELECT * FROM public."Transfers"
            WHERE "type" = $1
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
            cursor: Buffer.from(row.id.toString(), "ascii").toString("base64"),
          }));

          const endCursor =
            edges.length > 0 ? edges[edges.length - 1].cursor : null;

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

export default Transfer;
