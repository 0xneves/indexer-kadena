import { calculateNetworkHashRate } from '../../../src/utils/hashrate';
import { BlockWithDifficulty } from '../../../src/utils/difficulty';

describe('hashrate utilities', () => {
  describe('calculateNetworkHashRate', () => {
    it('should calculate the network hashrate correctly', () => {
      const blocks: BlockWithDifficulty[] = [
        {
          creationTime: 1672531200000,
          creationTimeDate: new Date('2023-01-01T00:00:00.000Z'),
          difficulty: 1000n,
          height: 100n,
          chainId: 0n,
        },
        {
          creationTime: 1672534800000,
          creationTimeDate: new Date('2023-01-01T01:00:00.000Z'),
          difficulty: 2000n,
          height: 101n,
          chainId: 0n,
        },
      ];

      const result = calculateNetworkHashRate(blocks);

      // The hashrate should be calculated as total difficulty divided by time span in seconds
      const expectedHashRate = 3000n / 3600n; // Total difficulty / time difference in seconds
      expect(result.toString()).toBe(expectedHashRate.toString());
    });

    it('should return 0 for a very short time span', () => {
      const blocks: BlockWithDifficulty[] = [
        {
          creationTime: Date.now(),
          creationTimeDate: new Date(),
          difficulty: 1000n,
          height: 100n,
          chainId: 0n,
        },
      ];

      const result = calculateNetworkHashRate(blocks);

      // The hashrate should be 0 for a time span less than 1 second
      expect(result.toString()).toBe('0');
    });

    it('should handle no blocks gracefully', () => {
      const blocks: BlockWithDifficulty[] = [];

      const result = calculateNetworkHashRate(blocks);

      // The hashrate should be 0 when there are no blocks
      expect(result.toString()).toBe('0');
    });
  });
});
