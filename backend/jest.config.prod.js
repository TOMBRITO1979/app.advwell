/** @type {import('jest').Config} */
// Minimal Jest config for production (compiled JS in dist/)
// Excludes .d.ts files and setup.js from test discovery
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.d\\.ts$',
    'setup\\.js$',
  ],
  testTimeout: 10000,
};
