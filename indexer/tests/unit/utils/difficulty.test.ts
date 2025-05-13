import {
  calculateBlockDifficulty,
  calculateTotalDifficulty,
  BlockWithDifficulty,
} from '../../../src/utils/difficulty';

describe('difficulty utilities', () => {
  describe('calculateBlockDifficulty', () => {
    it('should calculate difficulty from a base64url-encoded target', () => {
      // Test with a valid base64url string
      const target = 'O8OurrIX6E0wanz7E1QvMtqqgZIIut0jGAAAAAAAAAA';
      const result = calculateBlockDifficulty(target);

      // The result should be a BigInt representing the difficulty
      expect(typeof result).toBe('bigint');
      // The expected difficulty should be calculated based on the target
      const expectedDifficulty = 764153525537756429n; // Updated with actual expected value
      expect(result.toString()).toBe(expectedDifficulty.toString());
    });

    it('should handle another valid base64url string', () => {
      const target = 'jEAFlIuxUUirYSjoBcrF-kA9xh5AlfXwbhcAAAAAAAA';
      const result = calculateBlockDifficulty(target);

      // The result should be a BigInt representing the difficulty
      expect(typeof result).toBe('bigint');
      // The expected difficulty should be calculated based on the target
      const expectedDifficulty = 3074999956369647n; // Updated with actual expected value
      expect(result.toString()).toBe(expectedDifficulty.toString());
    });

    it('should handle base64url characters correctly', () => {
      const target = 'ufehpeNZ41iqECPe6wcuyScWVISdayDSFwAAAAAAAAA';
      const result = calculateBlockDifficulty(target);

      // The result should be a BigInt representing the difficulty
      expect(typeof result).toBe('bigint');
      // The expected difficulty should be calculated based on the target
      const expectedDifficulty = 774396262990619768n; // Updated with actual expected value
      expect(result.toString()).toBe(expectedDifficulty.toString());
    });
  });

  describe('calculateTotalDifficulty', () => {
    it('should calculate total difficulty for a complete set of blocks', () => {
      const currentHeight = 100n;
      const chainIds = [0, 1, 2];
      const blocks: BlockWithDifficulty[] = [
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 1000n,
          height: 100n,
          chainId: 0n,
        },
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 2000n,
          height: 100n,
          chainId: 1n,
        },
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 3000n,
          height: 100n,
          chainId: 2n,
        },
      ];

      const result = calculateTotalDifficulty(currentHeight, blocks, chainIds);

      // Total difficulty should be the sum of all block difficulties
      expect(result?.toString()).toBe('6000');
    });

    it('should handle orphaned blocks by averaging per chain', () => {
      const currentHeight = 100n;
      const chainIds = [0, 1];
      const blocks: BlockWithDifficulty[] = [
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 1000n,
          height: 100n,
          chainId: 0n,
        },
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 2000n,
          height: 100n,
          chainId: 0n, // Same chain as first block
        },
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 3000n,
          height: 100n,
          chainId: 1n,
        },
      ];

      const result = calculateTotalDifficulty(currentHeight, blocks, chainIds);

      // For chain 0: average of 1000 and 2000 = 1500
      // For chain 1: 3000
      // Total: 4500
      expect(result?.toString()).toBe('4500');
    });

    it('should return undefined when no complete set of blocks is found', () => {
      const currentHeight = 100n;
      const chainIds = [0, 1, 2];
      const blocks: BlockWithDifficulty[] = [
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 1000n,
          height: 100n,
          chainId: 0n,
        },
        // Missing blocks for chains 1 and 2
      ];

      const result = calculateTotalDifficulty(currentHeight, blocks, chainIds);

      expect(result).toBeUndefined();
    });

    it('should look back up to 3 blocks to find a complete set', () => {
      const currentHeight = 100n;
      const chainIds = [0, 1];
      const blocks: BlockWithDifficulty[] = [
        // Height 100 - incomplete
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 1000n,
          height: 100n,
          chainId: 0n,
        },
        // Height 99 - complete
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 2000n,
          height: 99n,
          chainId: 0n,
        },
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 3000n,
          height: 99n,
          chainId: 1n,
        },
      ];

      const result = calculateTotalDifficulty(currentHeight, blocks, chainIds);

      // Should use the complete set at height 99
      expect(result?.toString()).toBe('5000');
    });
  });
});
