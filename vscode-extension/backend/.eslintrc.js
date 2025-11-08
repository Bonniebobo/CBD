module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
        mocha: true, // For test files
        jest: true,
    },
    extends: [
        'eslint:recommended',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    ignorePatterns: [
        'node_modules/',
        'out/',
        'dist/',
        'build/',
        'coverage/',
        '*.log',
        '*.min.js',
        '*.map',
    ],
    rules: {
        'no-console': 'off', // Console.log is useful for backend logging
        'no-unused-vars': ['warn', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
        }],
        'no-undef': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'semi': ['error', 'always'],
        'quotes': ['warn', 'single'],
        'indent': ['warn', 4, { SwitchCase: 1 }],
        'comma-dangle': ['error', 'always-multiline'],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'computed-property-spacing': ['error', 'never'],
        'space-before-blocks': 'error',
        'keyword-spacing': 'error',
        'space-infix-ops': 'error',
        'eol-last': ['error', 'always'],
        'no-trailing-spaces': 'error',
    },
};
