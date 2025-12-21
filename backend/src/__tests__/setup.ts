/**
 * Jest test setup file
 * Configures the test environment before running tests
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-at-least-32-characters';

// Suppress console output during tests (optional - uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Clean up after all tests
afterAll(async () => {
  // Allow time for connections to close gracefully
  await new Promise(resolve => setTimeout(resolve, 500));
});
