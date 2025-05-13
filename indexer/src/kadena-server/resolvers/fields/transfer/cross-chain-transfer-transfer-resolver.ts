/**
 * Resolver for the crossChainTransfer field of the Transfer type.
 * This module retrieves the related cross-chain transfer for a given transfer.
 */
import { ResolverContext } from '../../../config/apollo-server-config';
import { TransferResolvers } from '../../../config/graphql-types';
import zod from 'zod';
import { buildTransferOutput } from '../../output/build-transfer-output';

/**
 * Zod schema for validating the transfer input parameters.
 * Requires a potentially nullable string for the pactId field and a non-nullable string for amount.
 */
const schema = zod.object({
  pactId: zod.string().nullable(),
  requestKey: zod.string(),
  amount: zod.string(),
  receiverAccount: zod.string(),
  senderAccount: zod.string(),
});

/**
 * Resolver function for the crossChainTransfer field of the Transfer type.
 * Retrieves the corresponding cross-chain transfer using the pactId if available.
 *
 * @param parent - The parent object containing the pactId and amount parameters
 * @param _args - GraphQL arguments (unused in this resolver)
 * @param context - The resolver context containing repositories and services
 * @returns The related cross-chain transfer data if pactId exists, otherwise null
 */
export const crossChainTransferTransferResolver: TransferResolvers<ResolverContext>['crossChainTransfer'] =
  async (parent, _args, context) => {
    const { pactId, requestKey, amount, receiverAccount, senderAccount } = schema.parse(parent);
    if (!pactId || (receiverAccount !== '' && senderAccount !== '')) {
      return null;
    }

    const output = await context.transferRepository.getCrossChainTransferByPactId({
      pactId,
      requestKey,
      amount,
      receiverAccount,
      senderAccount,
    });

    if (!output) return null;

    return buildTransferOutput(output);
  };
