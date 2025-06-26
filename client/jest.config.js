module.exports = {
  // Use the default Create React App Jest configuration
  preset: 'react-scripts',

  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Performance optimizations
  maxWorkers: process.env.CI ? 2 : '50%', // Limit workers in CI, use 50% of cores locally
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@utils$': '<rootDir>/src/utils/index.ts',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@vimUI/(.*)$': '<rootDir>/src/components/vimUI/$1',
    '^@theme$': '<rootDir>/src/theme/index.ts',
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/setupTests.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Specific thresholds for new components
    './src/components/wallet/components/AddressBookSelector.tsx': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['react-app'] }],
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'web.js',
    'js',
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Reset mocks between tests
  resetMocks: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output for CI
  verbose: process.env.CI === 'true',
  
  // Test timeout (reduced for faster feedback)
  testTimeout: process.env.CI ? 5000 : 10000,

  // Skip tests that are slow or not critical for PR checks
  testPathIgnorePatterns: [
    '/node_modules/',
    process.env.CI && process.env.GITHUB_EVENT_NAME === 'pull_request' ? '/src/**/*.integration.test.*' : null,
  ].filter(Boolean),

  // Faster test running options
  bail: process.env.CI ? 1 : 0, // Stop on first failure in CI
  errorOnDeprecated: false, // Don't fail on deprecation warnings for speed

  // Global setup for tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true, // Faster compilation
    },
  },
};
