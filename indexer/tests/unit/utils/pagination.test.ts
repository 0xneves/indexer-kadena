import { encodeCursor, getPageInfo } from '../../../src/kadena-server/repository/pagination';

const PAGE_SIZE = 5 + 1;

describe('Pagination - DESC', () => {
  it('ROWS_LENGTH = PAGE_SIZE + 1', async () => {
    const limit = PAGE_SIZE;
    const order = 'DESC';

    const edges = ['6', '5', '4', '3', '2', '1'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const expectEdges = edges
      .map(e => ({ cursor: encodeCursor(e.cursor), node: e.node }))
      .slice(0, 5);

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'Ng==',
        endCursor: 'Mg==',
      },
      edges: expectEdges,
    });
  });

  it('ROWS_LENGTH = PAGE_SIZE', async () => {
    const limit = PAGE_SIZE;
    const order = 'DESC';

    const edges = ['5', '4', '3', '2', '1'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const expectEdges = edges.map(e => ({
      cursor: encodeCursor(e.cursor),
      node: e.node,
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'NQ==',
        endCursor: 'MQ==',
      },
      edges: expectEdges,
    });
  });

  it('ROWS_LENGTH < PAGE_SIZE', async () => {
    const limit = PAGE_SIZE;
    const order = 'DESC';

    const edges = ['4', '3', '2', '1'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const expectEdges = edges.map(e => ({
      cursor: encodeCursor(e.cursor),
      node: e.node,
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'NA==',
        endCursor: 'MQ==',
      },
      edges: expectEdges,
    });
  });

  it('hasPreviousPage = true', async () => {
    const limit = PAGE_SIZE;
    const order = 'DESC';

    const edges = ['5', '4', '3', '2', '1'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const expectEdges = edges.map(e => ({
      cursor: encodeCursor(e.cursor),
      node: e.node,
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
      after: '6',
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'NQ==',
        endCursor: 'MQ==',
      },
      edges: expectEdges,
    });
  });

  it('hasPreviousPage = false', async () => {
    const limit = PAGE_SIZE;
    const order = 'DESC';

    const edges = ['5', '4', '3', '2', '1'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const expectEdges = edges.map(e => ({
      cursor: encodeCursor(e.cursor),
      node: e.node,
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'NQ==',
        endCursor: 'MQ==',
      },
      edges: expectEdges,
    });
  });
});

describe('Pagination - ASC', () => {
  it('ROWS_LENGTH = PAGE_SIZE + 1', async () => {
    const limit = PAGE_SIZE;
    const order = 'ASC';

    const edges = ['1', '2', '3', '4', '5', '6'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const edgesExpected = ['5', '4', '3', '2', '1'].map(cursor => ({
      cursor: encodeCursor(cursor),
      node: { id: '_' },
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'NQ==',
        endCursor: 'MQ==',
      },
      edges: edgesExpected,
    });
  });

  it('ROWS_LENGTH = PAGE_SIZE', async () => {
    const limit = PAGE_SIZE;
    const order = 'ASC';

    const edges = ['1', '2', '3', '4', '5'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const edgesExpected = ['5', '4', '3', '2', '1'].map(cursor => ({
      cursor: encodeCursor(cursor),
      node: { id: '_' },
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'NQ==',
        endCursor: 'MQ==',
      },
      edges: edgesExpected,
    });
  });

  it('ROWS_LENGTH < PAGE_SIZE', async () => {
    const limit = PAGE_SIZE;
    const order = 'ASC';

    const edges = ['1', '2', '3', '4'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const edgesExpected = ['4', '3', '2', '1'].map(cursor => ({
      cursor: encodeCursor(cursor),
      node: { id: '_' },
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'NA==',
        endCursor: 'MQ==',
      },
      edges: edgesExpected,
    });
  });

  it('hasPreviousPage = true', async () => {
    const limit = PAGE_SIZE;
    const order = 'ASC';

    const edges = ['1', '2', '3', '4', '5'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const edgesExpected = ['5', '4', '3', '2', '1'].map(cursor => ({
      cursor: encodeCursor(cursor),
      node: { id: '_' },
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
      before: '6',
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'NQ==',
        endCursor: 'MQ==',
      },
      edges: edgesExpected,
    });
  });

  it('hasPreviousPage = false', async () => {
    const limit = PAGE_SIZE;
    const order = 'ASC';

    const edges = ['1', '2', '3', '4', '5'].map(cursor => ({
      cursor,
      node: { id: '_' },
    }));
    const edgesExpected = ['5', '4', '3', '2', '1'].map(cursor => ({
      cursor: encodeCursor(cursor),
      node: { id: '_' },
    }));

    const output = getPageInfo({
      edges,
      limit,
      order,
    });

    expect(output).toEqual({
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'NQ==',
        endCursor: 'MQ==',
      },
      edges: edgesExpected,
    });
  });
});
