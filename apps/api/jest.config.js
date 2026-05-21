module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  moduleNameMapper: {
    '^@akit/contracts$': '<rootDir>/../../packages/contracts/src/index',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'babel-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    '/node_modules/(?!(@akit/contracts)/)',
  ],
};
