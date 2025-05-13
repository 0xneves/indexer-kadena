import { getDecoded, delay, getRequiredEnvString } from '../../../src/utils/helpers';

jest.useFakeTimers();

describe('helpers utility functions', () => {
  describe('getDecoded', () => {
    it('should decode a valid base64 string and parse JSON', () => {
      const json = { key: 'value' };
      const encoded = Buffer.from(JSON.stringify(json)).toString('base64');
      expect(getDecoded(encoded)).toEqual(json);
    });

    it('should return null for invalid base64 string', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(getDecoded('invalid_base64')).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('delay', () => {
    it('should resolve after the specified delay', () => {
      const ms = 1000;
      const promise = delay(ms);

      jest.advanceTimersByTime(ms);

      return expect(promise).resolves.toBeUndefined();
    });
  });

  describe('getRequiredEnvString', () => {
    const ENV_VAR = 'TEST_ENV_VAR';

    beforeEach(() => {
      process.env[ENV_VAR] = 'test_value';
    });

    afterEach(() => {
      delete process.env[ENV_VAR];
    });

    it('should return the value of an existing environment variable', () => {
      expect(getRequiredEnvString(ENV_VAR)).toBe('test_value');
    });

    it('should throw an error if the environment variable is not set', () => {
      delete process.env[ENV_VAR];
      expect(() => getRequiredEnvString(ENV_VAR)).toThrow(
        `[ERROR][ENV][MISSING] Environment variable ${ENV_VAR} is required`,
      );
    });
  });
});
