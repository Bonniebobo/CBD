module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
    },
    extends: [
        'eslint:recommended',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    ignorePatterns: [
        '**/node_modules/**',
        '**/out/**',
        '**/dist/**',
        '**/build/**',
        '**/*.min.js',
        '**/coverage/**',
        '.next',
        '.nuxt',
        '.vercel',
        'p2/**',
        'P3/**',
    ],
    overrides: [
        // Backend JavaScript files
        {
            files: ['vscode-extension/backend/**/*.js'],
            extends: ['./vscode-extension/backend/.eslintrc.js'],
        },
        // Frontend TypeScript extension
        {
            files: ['vscode-extension/frontend/ai-chatbot-extension/**/*.ts'],
            extends: ['./vscode-extension/frontend/ai-chatbot-extension/.eslintrc.js'],
        },
        // Frontend Mock workspace
        {
            files: ['test-mock-workspace/**/*.{ts,tsx}'],
            extends: ['.test-mock-workspace/.eslintrc.js'],
        },
        // P3 projects
        {
            files: ['P3/P3-vscode-extension/**/*.ts'],
            extends: ['./P3/P3-vscode-extension/ai-chatbot-extension/.eslintrc.js'],
        },
        {
            files: ['P3/P3-vscode-extension/**/*.{ts,tsx}'],
            extends: ['./P3/P3-vscode-extension/ai-code-assistant-workspace/.eslintrc.js'],
        },
    ],
    rules: {
        'no-console': 'off', // Allow console.log for debugging
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-undef': 'error',
    },
};
