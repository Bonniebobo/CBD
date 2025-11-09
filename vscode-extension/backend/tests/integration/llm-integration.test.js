/**
 * Integration Tests for LLM Service with Real Gemini API
 *
 * Tests real Gemini API calls and responses.
 * Requires GEMINI_API_KEY environment variable.
 *
 * ⚠️  RATE LIMIT WARNING:
 * - Free tier: 10 requests per minute
 * - This suite makes ~7 API calls (within limit)
 * - Many tests are skipped to conserve quota
 * - If you hit rate limits, wait 60 seconds and retry
 *
 * Run: npm run test:llm-integration
 */

// Load environment variables from .env file
require('dotenv').config();

const LLMService = require('../../services/llmService');
const { mockFiles } = require('../test-data');

// Check if API key is available
const HAS_API_KEY = !!process.env.GEMINI_API_KEY;

// Skip all tests if no API key
const describeIfApiKey = HAS_API_KEY ? describe : describe.skip;

if (!HAS_API_KEY) {
    console.log('\n⚠️  Skipping Gemini integration tests (no API key)');
    console.log('   Set GEMINI_API_KEY environment variable to run these tests\n');
}

describeIfApiKey('LLM Integration Tests (Real Gemini API)', () => {
    let service;

    beforeAll(() => {
        console.log('\n🔑 Running LLM integration tests with real Gemini API');
        console.log('⚠️  Free tier limit: 10 requests/minute');
        console.log('⏱️  These tests may take 30-60 seconds...\n');
    });

    afterAll(() => {
        // Ensure all pending operations complete
        service = null;
    });

    beforeEach(() => {
        service = new LLMService();
    });

    describe('Constructor with Real API', () => {
        test('1.1: initializes successfully with valid API key', () => {
            expect(service.geminiModel).toBeDefined();
            expect(service.geminiModel).not.toBeNull();
            expect(service.geminiApiKey).toBeTruthy();
        });

        // Test 1.2 (invalid API key) would require changing environment variables
        // and is difficult to test reliably, so we'll skip it for now
    });

    describe('generateResponse() with Real API', () => {
        test('2.1: basic prompt returns valid non empty string response', async () => {
            const result = await service.generateResponse('Say hello', []);

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        }, 15000);

        test('2.2: handles code files and returns relevant response', async () => {
            const files = [{
                filename: 'test.js',
                content: 'console.log("Hello, world!");',
            }];

            const result = await service.generateResponse(
                'Explain what this code does',
                files,
            );

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result.toLowerCase()).toMatch(/console|log|hello|world|print|output/);
        }, 15000);

        test('2.3: handles multiple files', async () => {
            const files = mockFiles.slice(0, 2); // Just 2 files to save API quota

            const result = await service.generateResponse(
                'What files are here?',
                files,
            );

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(50);
        }, 15000);

        // test('2.4: handles empty files array', async () => {
        //     const result = await service.generateResponse('Hello', []);

        //     expect(result).toBeDefined();
        //     expect(typeof result).toBe('string');
        //     expect(result.length).toBeGreaterThan(0);
        // }, 15000);

        // test('2.5: handles large codebase (multiple files)', async () => {
        //     const files = mockFiles; // All mock files

        //     const result = await service.generateResponse(
        //         'Analyze this codebase',
        //         files,
        //     );

        //     expect(result).toBeDefined();
        //     expect(result.length).toBeGreaterThan(100);
        // }, 20000);

        // test('2.6: handles long file content', async () => {
        //     const longContent = Array(100).fill(0)
        //         .map((_, i) => `function func${i}() { return ${i}; }`)
        //         .join('\n');

        //     const files = [{ filename: 'large.js', content: longContent }];

        //     const result = await service.generateResponse(
        //         'What does this file contain?',
        //         files,
        //     );

        //     expect(result).toBeDefined();
        //     expect(result.length).toBeGreaterThan(0);
        // }, 20000);

        // test('2.7: execution time is reasonable', async () => {
        //     const startTime = Date.now();

        //     await service.generateResponse('Hello', []);

        //     const duration = Date.now() - startTime;
        //     expect(duration).toBeLessThan(10000); // Less than 10 seconds
        // }, 15000);

        // test('2.8: handles special characters in filenames', async () => {
        //     const files = [{
        //         filename: 'test-file_v2.tsx',
        //         content: 'const x = 1;',
        //     }];

        //     const result = await service.generateResponse(
        //         'What file is this?',
        //         files,
        //     );

        //     expect(result).toBeDefined();
        //     expect(result.length).toBeGreaterThan(0);
        // }, 15000);

        // test('2.9: handles code with syntax errors', async () => {
        //     const files = [{
        //         filename: 'broken.js',
        //         content: 'const x = ',
        //     }];

        //     const result = await service.generateResponse(
        //         'Is there an error in this code?',
        //         files,
        //     );

        //     expect(result).toBeDefined();
        //     expect(result.length).toBeGreaterThan(0);
        // }, 15000);
    });

    describe('generateGeminiResponse() Prompt Construction', () => {
        // These tests verify that the prompt is constructed correctly
        // by checking the AI's response reflects the context

        // test('3.4: includes currentFile in system prompt', async () => {
        //     const files = [
        //         { filename: 'index.js', content: 'console.log("index");' },
        //         { filename: 'utils.js', content: 'console.log("utils");' },
        //     ];

        //     const result = await service.generateGeminiResponse(
        //         'What file am I currently editing?',
        //         files,
        //         'index.js',
        //     );

        //     expect(result).toBeDefined();
        //     // Response should mention index.js since it's the current file
        // }, 15000);

        // test('3.5: handles missing currentFile', async () => {
        //     const files = [{ filename: 'test.js', content: 'code' }];

        //     const result = await service.generateGeminiResponse(
        //         'What files do you see?',
        //         files,
        //         null,
        //     );

        //     expect(result).toBeDefined();
        //     expect(result.length).toBeGreaterThan(0);
        // }, 15000);
    });

    describe('Error Handling with Real API', () => {
        test('4.1: invalid API key throws error', async () => {
            // Create service with no API key
            const originalKey = process.env.GEMINI_API_KEY;
            delete process.env.GEMINI_API_KEY;

            const badService = new LLMService();

            await expect(badService.generateResponse('test', []))
                .rejects
                .toThrow(/Gemini model not initialized/);

            // Restore key
            process.env.GEMINI_API_KEY = originalKey;
        });
    });

    describe('Context Usage Verification', () => {
        test('5.1: files mentioned in response', async () => {
            const files = [
                { filename: 'App.tsx', content: 'import React from "react";' },
                { filename: 'package.json', content: '{"name": "test"}' },
            ];

            const result = await service.generateResponse(
                'What files are in this codebase?',
                files,
            );

            expect(result).toBeDefined();
            // Response should mention the files (case-insensitive)
            const lowerResult = result.toLowerCase();
            const mentionsApp = lowerResult.includes('app') || lowerResult.includes('tsx');
            const mentionsPackage = lowerResult.includes('package');

            expect(mentionsApp || mentionsPackage).toBe(true);
        }, 15000);

        //         test('5.2: currentFile parameter influences response', async () => {
        //             const files = [
        //                 { filename: 'index.js', content: 'console.log("Entry point");' },
        //                 { filename: 'utils.js', content: 'function helper() {}' },
        //             ];

        //             const result = await service.generateResponse(
        //                 'Describe the current file',
        //                 files,
        //                 'index.js',
        //             );

        //             expect(result).toBeDefined();
        //             // Response should focus on index.js
        //             const lowerResult = result.toLowerCase();
        //             expect(lowerResult.includes('index') || lowerResult.includes('entry') || lowerResult.includes('console')).toBe(true);
        //         }, 15000);

        //         test('5.3: directory structure reflected in response', async () => {
        //             const files = [
        //                 { filename: 'src/components/Button.tsx', content: 'export const Button = () => {};' },
        //                 { filename: 'src/utils/helpers.js', content: 'export const help = () => {};' },
        //                 { filename: 'package.json', content: '{}' },
        //             ];

        //             const result = await service.generateResponse(
        //                 'What\'s the project structure?',
        //                 files,
        //             );

        //             expect(result).toBeDefined();
        //             // Response should mention directory structure
        //             const lowerResult = result.toLowerCase();
        //             const mentionsStructure =
        //                 lowerResult.includes('src') ||
        //                 lowerResult.includes('components') ||
        //                 lowerResult.includes('folder') ||
        //                 lowerResult.includes('directory');

        //             expect(mentionsStructure).toBe(true);
        //         }, 15000);

        //         test('5.4: file content used in analysis', async () => {
        //             const files = [{
        //                 filename: 'calculator.js',
        //                 content: `
        // function calculateTotal(items) {
        //     return items.reduce((sum, item) => sum + item.price, 0);
        // }
        //                 `,
        //             }];

        //             const result = await service.generateResponse(
        //                 'What does the calculateTotal function do?',
        //                 files,
        //             );

        //             expect(result).toBeDefined();
        //             const lowerResult = result.toLowerCase();
        //             const mentionsFunction =
        //                 lowerResult.includes('calculate') ||
        //                 lowerResult.includes('total') ||
        //                 lowerResult.includes('sum') ||
        //                 lowerResult.includes('price') ||
        //                 lowerResult.includes('items');

        //             expect(mentionsFunction).toBe(true);
        //         }, 15000);
    });


    describe('Service Status', () => {
        test('reports correct availability with API key', () => {
            const status = service.getStatus();

            expect(status.geminiAvailable).toBe(true);
            expect(status.geminiApiKey).toBe(true);
            expect(status.service).toBe('LLMService');
        });

        test('isGeminiAvailable returns true with valid key', () => {
            expect(service.isGeminiAvailable()).toBe(true);
        });
    });
});

/**
 * Test Summary:
 * - Total: 8 tests (7 active + many skipped)
 * - API calls: ~7 requests (within free tier limit of 10/minute)
 * - Skipped tests conserve API quota and avoid rate limiting
 * - Core LLM functionality is still validated
 */

// Export for potential use in other tests
module.exports = {
    HAS_API_KEY,
};

