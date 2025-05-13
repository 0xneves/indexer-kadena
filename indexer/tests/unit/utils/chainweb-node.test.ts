import { formatBalance_NODE, formatGuard_NODE } from '../../../src/utils/chainweb-node';
import { PactQueryResponse } from '../../../src/kadena-server/config/graphql-types';

describe('chainweb-node utility functions', () => {
  describe('formatBalance_NODE', () => {
    it('should handle balance with decimal format', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: JSON.stringify({
          balance: {
            decimal: '123.45',
          },
        }),
      };
      expect(formatBalance_NODE(queryResult)).toBe(123.45);
    });

    it('should handle direct balance value', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: JSON.stringify({
          balance: 100,
        }),
      };
      expect(formatBalance_NODE(queryResult)).toBe(100);
    });

    it('should return 0 for missing balance', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: JSON.stringify({}),
      };
      expect(formatBalance_NODE(queryResult)).toBe(0);
    });

    it('should return 0 for invalid JSON', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: 'invalid json',
      };
      expect(formatBalance_NODE(queryResult)).toBe(0);
    });
  });

  describe('formatGuard_NODE', () => {
    it('should handle function-based guards', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: JSON.stringify({
          guard: {
            fun: 'keys-all',
            args: [{ keys: ['key1', 'key2'] }],
          },
        }),
      };
      const expected = {
        args: ['{"keys":["key1","key2"]}'],
        fun: 'keys-all',
        raw: JSON.stringify({ fun: 'keys-all', args: [{ keys: ['key1', 'key2'] }] }),
        keys: [],
        predicate: '',
      };
      expect(formatGuard_NODE(queryResult)).toEqual(expected);
    });

    it('should handle predicate-based guards', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: JSON.stringify({
          guard: {
            pred: 'keys-any',
            keys: ['key1', 'key2'],
          },
        }),
      };
      const expected = {
        keys: ['key1', 'key2'],
        predicate: 'keys-any',
        raw: JSON.stringify({ pred: 'keys-any', keys: ['key1', 'key2'] }),
      };
      expect(formatGuard_NODE(queryResult)).toEqual(expected);
    });

    it('should handle other guard formats', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: JSON.stringify({
          guard: {
            custom: 'format',
          },
        }),
      };
      const expected = {
        raw: JSON.stringify({ custom: 'format' }),
        keys: [],
        predicate: '',
      };
      expect(formatGuard_NODE(queryResult)).toEqual(expected);
    });

    it('should handle missing guard', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: JSON.stringify({}),
      };
      const expected = {
        raw: 'null',
        keys: [],
        predicate: '',
      };
      expect(formatGuard_NODE(queryResult)).toEqual(expected);
    });

    it('should handle invalid JSON', () => {
      const queryResult: PactQueryResponse = {
        chainId: '0',
        code: '0',
        status: 'success',
        result: 'invalid json',
      };
      const expected = {
        raw: 'null',
        keys: [],
        predicate: '',
      };
      expect(formatGuard_NODE(queryResult)).toEqual(expected);
    });
  });
});
