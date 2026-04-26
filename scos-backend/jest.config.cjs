/* global module */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/tests/setup-env.ts'],
  roots: ['<rootDir>/src/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  moduleNameMapper: {
    '^pdfkit$': '<rootDir>/src/tests/__mocks__/pdfkit.ts'
  }
};
