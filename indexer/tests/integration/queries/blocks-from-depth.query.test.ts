import { GraphQLClient } from 'graphql-request';
import { getBlocksFromDepthQuery } from '../builders/blocks-from-depth.builder';
import { blocksFromDepthFixture001 } from '../fixtures/blocks-from-depth/blocks-from-depth.fixture.001';
import { blocksFromDepthFixture002 } from '../fixtures/blocks-from-depth/blocks-from-depth.fixture.002';
const client = new GraphQLClient(process.env.API_URL ?? 'http://localhost:3001/graphql');

describe('Blocks from depth', () => {
  it('#001', async () => {
    const query = getBlocksFromDepthQuery({ minimumDepth: 3, after: 'NTc4NTg5MDoxOQ==' });
    const data = await client.request(query);
    expect(blocksFromDepthFixture001.data).toMatchObject(data);
  });

  it('#002', async () => {
    const query = getBlocksFromDepthQuery({
      minimumDepth: 5,
      chainIds: ['12', '13'],
      after: 'NTc4NTcxNDoxMg==',
    });
    const data = await client.request(query);
    expect(blocksFromDepthFixture002.data).toMatchObject(data);
  });
});
