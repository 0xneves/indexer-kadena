import { GraphQLClient } from 'graphql-request';
import { getTransactionQuery } from '../builders/transaction.builder';
import { transactionFixture001 } from '../fixtures/transaction/transaction.fixture.001';
import { transactionFixture002 } from '../fixtures/transaction/transaction.fixture.002';
import { transactionFixture003 } from '../fixtures/transaction/transaction.fixture.003';
import { transactionFixture004 } from '../fixtures/transaction/transaction.fixture.004';
const client = new GraphQLClient(process.env.API_URL ?? 'http://localhost:3001/graphql');

describe('Transaction', () => {
  it('#001', async () => {
    const query = getTransactionQuery({
      requestKey: 'Jeva9G9yC0WKOvZPS0VamcVp5wJqOOXZW4jdlnIcE9k',
    });
    const data = await client.request(query);
    expect(transactionFixture001.data).toMatchObject(data);
  });

  it('#002', async () => {
    const query = getTransactionQuery({
      requestKey: 'GuNdksJ1JpFtqXHAic5GTc0tJwR1cBSZaQ1GrINk8B0',
      minimumDepth: 60,
    });
    const data = await client.request(query);
    expect(transactionFixture002.data).toMatchObject(data);
  });

  it('#003', async () => {
    const query = getTransactionQuery({
      requestKey: 'GuNdksJ1JpFtqXHAic5GTc0tJwR1cBSZaQ1GrINk8B0',
      minimumDepth: 101,
    });

    await expect(client.request(query)).rejects.toMatchObject({
      response: transactionFixture003,
    });
  });

  it('#004', async () => {
    const query = getTransactionQuery({
      requestKey: 'GuNdksJ1JpFtqXHAic5GTc0tJwR1cBSZaQ1GrINk8B0',
      minimumDepth: 0,
    });

    await expect(client.request(query)).rejects.toMatchObject({
      response: transactionFixture004,
    });
  });
});
