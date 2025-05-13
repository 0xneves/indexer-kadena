import { Block, FungibleChainAccount, InputMaybe, PageInfo } from '../../config/graphql-types';
import { PaginationsParams } from '../pagination';
import { ConnectionEdge } from '../types';
import { TransactionOutput } from './transaction-repository';

export interface GetBlocksFromDepthParams extends PaginationsParams {
  chainIds?: InputMaybe<string[]>;
  minimumDepth: InputMaybe<number>;
}

export interface GetCompletedBlocksParams extends PaginationsParams {
  completedHeights?: boolean | null;
  heightCount?: number | null;
  chainIds?: string[] | null;
}

export interface GetBlocksBetweenHeightsParams extends PaginationsParams {
  chainIds?: InputMaybe<string[]>;
  startHeight: number;
  endHeight?: InputMaybe<number>;
}

export interface GetLatestBlocksParams {
  creationTime: number;
  lastBlockId?: number;
  chainIds?: string[];
}

export type BlockOutput = Omit<Block, 'parent' | 'events' | 'minerAccount' | 'transactions'> & {
  parentHash: string;
  blockId: number;
};

export type FungibleChainAccountOutput = Omit<
  FungibleChainAccount,
  'transactions' | 'transfers' | 'hash'
>;

export default interface BlockRepository {
  getBlockByHash(hash: string): Promise<BlockOutput>;
  getBlocksFromDepth(params: GetBlocksFromDepthParams): Promise<{
    pageInfo: PageInfo;
    edges: ConnectionEdge<BlockOutput>[];
  }>;
  getBlocksBetweenHeights(params: GetBlocksBetweenHeightsParams): Promise<{
    pageInfo: PageInfo;
    edges: ConnectionEdge<BlockOutput>[];
  }>;
  getCompletedBlocks(params: GetCompletedBlocksParams): Promise<{
    pageInfo: PageInfo;
    edges: ConnectionEdge<BlockOutput>[];
  }>;
  getMinerData(hash: string, chainId: string): Promise<FungibleChainAccountOutput>;

  getLowestBlockHeight(): Promise<number>;

  getLastBlockHeight(): Promise<number>;

  getChainIds(): Promise<number[]>;

  getTotalCountOfBlockEvents(blockHash: string): Promise<number>;

  getTotalCountOfBlockTransactions(blockHash: string): Promise<number>;

  getLatestBlocks(params: GetLatestBlocksParams): Promise<BlockOutput[]>;

  getTransactionsOrderedByBlockDepth(
    transactions: TransactionOutput[],
  ): Promise<TransactionOutput[]>;

  getLastBlocksWithDepth(
    chainIds: string[],
    minimumDepth: number,
    startingTimestamp: number,
    id?: string,
  ): Promise<BlockOutput[]>;

  // dataloader
  getBlocksByEventIds(eventIds: string[]): Promise<BlockOutput[]>;
  getBlocksByTransactionIds(transactionIds: string[]): Promise<BlockOutput[]>;
  getBlockByHashes(hashes: string[]): Promise<BlockOutput[]>;
}
