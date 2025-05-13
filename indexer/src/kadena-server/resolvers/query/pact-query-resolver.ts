import { ResolverContext } from '../../config/apollo-server-config';
import { QueryResolvers } from '../../config/graphql-types';
import { handleSingleQuery } from '../../../utils/raw-query';

export const pactQueryResolver: QueryResolvers<ResolverContext>['pactQuery'] = async (
  _parent,
  args,
) => {
  const res = await Promise.all(args.pactQuery.map(handleSingleQuery));

  return res;
};
