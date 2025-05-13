/**
 * Resolver for the totalCount field of the BlockTransactionsConnection type.
 * This module counts transactions associated with a specific block.
 */
import { ResolverContext } from '../../../config/apollo-server-config';
import { BlockTransactionsConnectionResolvers } from '../../../config/graphql-types';
import zod from 'zod';

/**
 * Zod schema for validating the block hash parameter.
 * Requires a non-nullable string for the blockHash field.
 */
const schema = zod.object({
  blockHash: zod.string(),
});

/**
 * Resolver function for the totalCount field of the BlockTransactionsConnection type.
 * Retrieves the total count of transactions associated with the specified block.
 *
 * @param parent - The parent object containing the blockHash parameter
 * @param _args - GraphQL arguments (unused in this resolver)
 * @param context - The resolver context containing repositories and services
 * @returns The total count of transactions for the specified block
 */
export const totalCountBlockTransactionsConnectionResolver: BlockTransactionsConnectionResolvers<ResolverContext>['totalCount'] =
  async (parent, _args, context) => {
    const { blockHash } = schema.parse(parent);

    const total = await context.blockRepository.getTotalCountOfBlockTransactions(blockHash);

    return total;
  };
