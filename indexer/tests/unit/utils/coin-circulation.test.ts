import { getCirculationNumber } from '../../../src/utils/coin-circulation';
import fs from 'fs';

// Mock the file system module
jest.mock('fs', () => ({
  readFile: jest.fn(),
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('coin circulation utilities', () => {
  const mockMinerRewardsCsv = `
    100,1.0
    200,0.5
    300,0.25
  `;

  const mockTokenPaymentsCsv = `
    chain1,2023-01-01T00:00:00Z,key1,1000,0
    chain2,2023-01-02T00:00:00Z,key2,2000,0
    chain3,2023-01-03T00:00:00Z,key3,3000,0
  `;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCirculationNumber', () => {
    it('should calculate total circulation correctly', async () => {
      // Mock the fs.readFile function to return different CSV content based on the file path
      mockedFs.readFile.mockImplementation((...args: any[]) => {
        const [filePath, , callback] = args;
        const pathStr = filePath.toString();
        if (pathStr.includes('miner_rewards.csv')) {
          callback(null, mockMinerRewardsCsv);
        } else if (pathStr.includes('token_payments.csv')) {
          callback(null, mockTokenPaymentsCsv);
        } else {
          callback(new Error('Unknown file path'), '');
        }
      });

      // Test with a height that falls between the second and third reward periods
      const height = 5000; // Average chain height will be 250 (5000/20)
      // Use a timestamp that's in the middle of the second day (2023-01-02)
      // This should include the first two token payments (1000 + 2000 = 3000)
      const timestamp = new Date('2023-01-02T12:00:00Z').getTime() * 1000; // Convert to microseconds

      const result = await getCirculationNumber(height, timestamp);

      // Expected calculation:
      // Miner rewards:
      // - First period (0-100): 100 blocks * 1.0 = 100
      // - Second period (100-200): 100 blocks * 0.5 = 50
      // - Third period (200-250): 50 blocks * 0.25 = 12.5
      // Total miner rewards: 162.5
      // Token payments up to 2023-01-02T12:00:00Z: 1000 + 2000 = 3000
      // Total circulation: 3162.5
      expect(result).toBe(3162.5);
    });

    it('should handle file reading errors gracefully', async () => {
      mockedFs.readFile.mockImplementation((...args: any[]) => {
        const [, , callback] = args;
        callback(new Error('File not found'), '');
      });

      const height = 5000;
      const timestamp = new Date('2023-01-02T12:00:00Z').getTime() * 1000; // Convert to microseconds

      await expect(getCirculationNumber(height, timestamp)).rejects.toThrow('File not found');
    });
  });
});
