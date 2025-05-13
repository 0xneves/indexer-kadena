import { convertStringToDate } from '../../../src/utils/date';

describe('date utilities', () => {
  describe('convertStringToDate', () => {
    it('should convert a microsecond timestamp string to a Date object', () => {
      // Test with a timestamp in microseconds (2023-01-01T00:00:00.000Z)
      const timestamp = '1672531200000000'; // 2023-01-01T00:00:00.000Z in microseconds
      const result = convertStringToDate(timestamp);

      // The result should be a Date object representing the same time
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should handle timestamps with different precisions', () => {
      // Test with a timestamp that's not exactly on a second boundary
      const timestamp = '1672531200123456'; // 2023-01-01T00:00:00.123Z in microseconds
      const result = convertStringToDate(timestamp);

      expect(result.toISOString()).toBe('2023-01-01T00:00:00.123Z');
    });

    it('should throw an error for non-string input', () => {
      // Test with a number instead of a string
      const timestamp = 1672531200000000;

      expect(() => convertStringToDate(timestamp as any)).toThrow(
        'The input timestamp must be a string.',
      );
    });

    it('should throw an error for timestamps too large to convert', () => {
      // Test with a timestamp that's way beyond MAX_SAFE_INTEGER when converted to milliseconds
      // Using 2^64 as a very large number that will definitely exceed the safe integer range
      const timestamp = (2n ** 64n).toString();

      expect(() => convertStringToDate(timestamp)).toThrow(
        'The timestamp is too large to safely convert to a JavaScript number.',
      );
    });

    it('should handle timestamps at the edge of safe integer range', () => {
      // Test with a timestamp that's exactly at MAX_SAFE_INTEGER when converted to milliseconds
      const timestamp = (BigInt(Number.MAX_SAFE_INTEGER) * 1000n).toString();

      const result = convertStringToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
    });
  });
});
