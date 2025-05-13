import EventQueryBuilder from '../../../src/kadena-server/repository/infra/query-builders/event-query-builder';

describe('EventQueryBuilder', () => {
  let queryBuilder: EventQueryBuilder;

  beforeEach(() => {
    queryBuilder = new EventQueryBuilder();
  });

  describe('buildEventsWithQualifiedNameQuery', () => {
    const defaultParams = {
      qualifiedEventName: 'module.event',
      limit: 10,
      order: 'DESC',
      after: null,
      before: null,
    };

    it('should build basic query with module.name', () => {
      // Arrange
      const params = { ...defaultParams };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH event_filtered AS');
      expect(query).toContain('WHERE e.module = $2');
      expect(query).toContain('AND e.name = $3');
      expect(query).toContain('ORDER BY e.id DESC');
      expect(query).toContain('LIMIT $1');
      expect(queryParams).toEqual([10, 'module', 'event']);
    });

    it('should add pagination conditions when after is provided', () => {
      // Arrange
      const params = { ...defaultParams, after: '100' };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('AND e.id < $4');
      expect(queryParams).toEqual([10, 'module', 'event', '100']);
    });

    it('should add pagination conditions when before is provided', () => {
      // Arrange
      const params = { ...defaultParams, before: '200' };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('AND e.id > $4');
      expect(queryParams).toEqual([10, 'module', 'event', '200']);
    });

    it('should switch to block-filtered query when blockHash is provided', () => {
      // Arrange
      const params = { ...defaultParams, blockHash: 'abc123' };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b.hash = $4');
      expect(query).toContain('ORDER BY b.height DESC');
      expect(queryParams).toEqual([10, 'module', 'event', 'abc123']);
    });

    it('should switch to block-filtered query when chainId is provided', () => {
      // Arrange
      const params = { ...defaultParams, chainId: '1' };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b."chainId" = $4');
      expect(query).toContain('ORDER BY b.height DESC');
      expect(queryParams).toEqual([10, 'module', 'event', '1']);
    });

    it('should add height conditions when minHeight is provided', () => {
      // Arrange
      const params = { ...defaultParams, minHeight: 100 };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b."height" >= $4');
      expect(query).toContain('AND b."height" <= $5');
      expect(queryParams).toEqual([10, 'module', 'event', 100, 300]); // HEIGHT_BATCH_SIZE is 200
    });

    it('should add height conditions when maxHeight is provided', () => {
      // Arrange
      const params = { ...defaultParams, maxHeight: 500 };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b."height" >= $4');
      expect(query).toContain('AND b."height" <= $5');
      expect(queryParams).toEqual([10, 'module', 'event', 300, 500]); // HEIGHT_BATCH_SIZE is 200
    });

    it('should add height conditions when both minHeight and maxHeight are provided', () => {
      // Arrange
      const params = { ...defaultParams, minHeight: 100, maxHeight: 500 };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b."height" >= $4');
      expect(query).toContain('AND b."height" <= $5');
      expect(queryParams).toEqual([10, 'module', 'event', 100, 300]); // HEIGHT_BATCH_SIZE is 200
    });

    it('should add height conditions when minHeight and maxHeight are close together', () => {
      // Arrange
      const params = { ...defaultParams, minHeight: 100, maxHeight: 150 };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b."height" >= $4');
      expect(query).toContain('AND b."height" <= $5');
      expect(queryParams).toEqual([10, 'module', 'event', 100, 150]); // Should use actual maxHeight
    });

    it('should use requestKey filtering when provided', () => {
      // Arrange
      const params = { ...defaultParams, requestKey: 'req123' };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH event_transaction_filtered AS');
      expect(query).toContain('AND t.requestkey = $4');
      expect(queryParams).toEqual([10, 'module', 'event', 'req123']);
    });

    it('should handle combined filtering with blockHash and pagination', () => {
      // Arrange
      const params = {
        ...defaultParams,
        blockHash: 'abc123',
        after: '100',
      };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b.hash = $5');
      expect(query).toContain('AND e.id < $4');
      expect(queryParams).toEqual([10, 'module', 'event', '100', 'abc123']);
    });

    it('should handle combined filtering with chainId and height range', () => {
      // Arrange
      const params = {
        ...defaultParams,
        chainId: '1',
        minHeight: 100,
        maxHeight: 500,
      };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b."chainId" = $4');
      expect(query).toContain('AND b."height" >= $5');
      expect(query).toContain('AND b."height" <= $6');
      expect(queryParams).toEqual([10, 'module', 'event', '1', 100, 300]);
    });

    it('should parse qualifiedEventName with multiple dot separators correctly', () => {
      // Arrange
      const params = { ...defaultParams, qualifiedEventName: 'complex.module.path.event' };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(queryParams[1]).toEqual('complex.module.path');
      expect(queryParams[2]).toEqual('event');
    });

    it('should handle filtering with multiple conditions', () => {
      // Arrange
      const params = {
        ...defaultParams,
        blockHash: 'abc123',
        chainId: '1',
        minHeight: 100,
        maxHeight: 500,
        after: '100',
        before: '200',
      };

      // Act
      const { query, queryParams } = queryBuilder.buildEventsWithQualifiedNameQuery(params);

      // Assert
      expect(query).toContain('WITH block_filtered AS');
      expect(query).toContain('WHERE b.hash = $6');
      expect(query).toContain('AND b."chainId" = $7');
      expect(query).toContain('AND b."height" >= $8');
      expect(query).toContain('AND b."height" <= $9');
      expect(query).toContain('AND e.id < $4');
      expect(query).toContain('AND e.id > $5');
      expect(queryParams).toEqual([10, 'module', 'event', '100', '200', 'abc123', '1', 100, 300]);
    });
  });
});
