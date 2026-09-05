module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@react-pdf/renderer$': '<rootDir>/__tests__/__mocks__/react-pdf.ts',
  },
};
