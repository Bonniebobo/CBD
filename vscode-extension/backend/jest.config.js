module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'services/**/*.js',
        'index.js',
        '!**/node_modules/**',
    ],
    testMatch: [
        '**/tests/**/*.test.js',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    testTimeout: 20000, // 20 seconds default timeout for all tests
};

