import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../config/database";
import Transaction from "./transaction";

export interface SignerAttributes {
  id: number;
  address?: string;
  orderIndex?: number;
  pubkey: string;
  clist: object;
  transactionId: number;
}

interface SignerCreationAttributes extends Optional<SignerAttributes, "id"> {}

class Signer
  extends Model<SignerAttributes, SignerCreationAttributes>
  implements SignerAttributes
{
  public id!: number;
  public address?: string;
  public orderIndex?: number;
  public pubkey!: string;
  public clist!: object;
  public transactionId!: number;
}

Signer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: "The unique identifier for the signer",
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "The address of the signer",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "The order index for the signer",
    },
    pubkey: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "The public key of the signer",
    },
    clist: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "The capabilities list (clist) associated with the signer",
    },
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Transactions",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      comment: "Foreign key referencing the related transaction ID",
    },
  },
  {
    sequelize,
    modelName: "Signer",
    tableName: "Signers",
    timestamps: true,
  },
);

// Set up association with Transaction
Signer.belongsTo(Transaction, {
  foreignKey: "transactionId",
  as: "transaction",
});

export default Signer;
