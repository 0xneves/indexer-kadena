import { uint64ToInt64, int64ToUint64String } from '../../../src/utils/int-uint-64';

describe('int-uint-64 conversion functions', () => {
  describe('uint64ToInt64', () => {
    it('should convert a uint64 value within int64 range to the same value', () => {
      expect(uint64ToInt64('9223372036854775807')).toBe(BigInt('9223372036854775807'));
    });

    it('should convert a uint64 value outside int64 range to a negative int64 value', () => {
      expect(uint64ToInt64('18446744073709551615')).toBe(BigInt('-1'));
    });

    it('should throw an error for a value out of uint64 range', () => {
      expect(() => uint64ToInt64('-1')).toThrow('Value is out of range for uint64');
      expect(() => uint64ToInt64('18446744073709551616')).toThrow(
        'Value is out of range for uint64',
      );
    });
  });

  describe('int64ToUint64String', () => {
    it('should convert a positive int64 value to the same uint64 string', () => {
      expect(int64ToUint64String('9223372036854775807')).toBe('9223372036854775807');
    });

    it('should convert a negative int64 value to the corresponding uint64 string', () => {
      expect(int64ToUint64String('-1')).toBe('18446744073709551615');
    });

    it('should throw a RangeError for a value out of int64 range', () => {
      expect(() => int64ToUint64String('-9223372036854775809')).toThrow(
        'Value is out of range for int64',
      );
      expect(() => int64ToUint64String('9223372036854775808')).toThrow(
        'Value is out of range for int64',
      );
    });
  });
});
