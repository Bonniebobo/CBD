/**
 * Integration Tests for Backend API
 *
 * Tests full HTTP API with real Express server.
 * Requires server running on port 3001.
 *
 * IMPORTANT: These tests DO NOT make LLM API calls!
 * - Only tests HTTP endpoints, validation, CORS, and error handling
 * - Tests that would trigger LLM responses are skipped
 * - LLM functionality is tested separately in llm-integration.test.js
 * - Safe to run in CI without GEMINI_API_KEY or incurring API costs
 *
 * Run: npm run test:integration
 */

// Load environment variables from .env file
require('dotenv').config();

const request = require('supertest');
const { mockFiles } = require('../test-data');

// Base URL for the server - assumes server is running
const BASE_URL = 'http://localhost:3001';

// Flag for conditional test skipping (health endpoint checks only)
const HAS_API_KEY = !!process.env.GEMINI_API_KEY;

describe('API Integration Tests', () => {
    // Skip all tests if server is not running
    beforeAll(async () => {
        try {
            await request(BASE_URL).get('/health');
        } catch {
            console.error('❌ Server is not running on port 3001');
            console.error('   Start server with: npm start');
            throw new Error('Server not available for integration tests');
        }
    });

    describe('GET /health', () => {
        test('1.1: returns 200 status', async () => {
            const response = await request(BASE_URL).get('/health');
            expect(response.status).toBe(200);
        });

        test('1.2: returns healthy status', async () => {
            const response = await request(BASE_URL).get('/health');
            expect(response.body.status).toBe('healthy');
        });

        test('1.3: includes uptime', async () => {
            const response = await request(BASE_URL).get('/health');
            expect(response.body.uptime).toBeDefined();
            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThan(0);
        });

        test('1.4: includes timestamp', async () => {
            const response = await request(BASE_URL).get('/health');
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        test('1.5: includes LLM status object', async () => {
            const response = await request(BASE_URL).get('/health');
            expect(response.body.llmStatus).toBeDefined();
            expect(typeof response.body.llmStatus).toBe('object');
        });

        test('1.6: LLM status reflects API key present', async () => {
            if (!HAS_API_KEY) {
                console.log('⚠️  Skipping test 1.6: No API key (cannot verify this scenario)');
                return;
            }

            // Just queries health endpoint - no LLM API call
            const response = await request(BASE_URL).get('/health');
            expect(response.body.llmStatus.geminiAvailable).toBe(true);
            expect(response.body.llmStatus.geminiApiKey).toBe(true);
        });

        test('1.7: LLM status reflects no API key', async () => {
            if (HAS_API_KEY) {
                console.log('⚠️  Skipping test 1.7: API key is present, cannot test no-key scenario');
                return;
            }

            // Only runs when there's NO API key in .env
            const response = await request(BASE_URL).get('/health');
            expect(response.body.llmStatus.geminiAvailable).toBe(false);
            expect(response.body.llmStatus.geminiApiKey).toBe(false);
        });
    });

    describe('POST /upload - Basic Acceptance', () => {
        test.skip('2.1: accepts POST with valid data', async () => {
            // Skipped: This test makes real LLM API calls
            // LLM functionality is tested in llm-integration.test.js
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ files: [mockFiles[0]], prompt: 'Explain this code' });

            expect(response.status).toBe(200);
        });

        test.skip('2.2: returns JSON content-type', async () => {
            // Skipped: This test makes real LLM API calls
            // LLM functionality is tested in llm-integration.test.js
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ files: [], prompt: 'test' });

            expect(response.headers['content-type']).toMatch(/application\/json/);
        });
    });

    describe('Upload Validation', () => {
        test('3.1: rejects missing files', async () => {
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ prompt: 'test' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('files must be an array');
        });

        test('3.2: rejects non-array files', async () => {
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ files: 'string', prompt: 'test' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('files must be an array');
        });

        test('3.3: rejects missing prompt', async () => {
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ files: [] });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('prompt must be a string');
        });

        test('3.4: rejects non-string prompt', async () => {
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ files: [], prompt: 123 });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('prompt must be a string');
        });

        test.skip('3.5: accepts empty files array', async () => {
            // Skipped: This test makes real LLM API calls
            // Validation passing is tested by absence of 400 errors in other tests
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ files: [], prompt: 'test' });

            expect(response.status).toBe(200);
        });
    });

    describe('Upload Processing', () => {
        // All these tests are skipped because they require actual LLM API calls
        // Upload functionality with real LLM is tested in llm-integration.test.js
        // These tests are kept for documentation purposes

        test.skip('4.1: returns complete response structure', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.2: returns aiResponse from LLM', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.3: returns directoryTree', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.4: returns llmStatus', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.5: returns metadata with filesProcessed', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.6: returns metadata with totalCharacters', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.7: returns metadata with ISO timestamp', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.8: returns success message with file count', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });

        test.skip('4.15: directoryTree structure is correct', async () => {
            // Requires LLM API call - tested in llm-integration.test.js
        });
    });

    describe('404 Handler', () => {
        test('5.1: returns 404 status for GET', async () => {
            const response = await request(BASE_URL).get('/nonexistent');
            expect(response.status).toBe(404);
        });

        test('5.2: returns 404 status for POST', async () => {
            const response = await request(BASE_URL).post('/invalid');
            expect(response.status).toBe(404);
        });

        test('5.3: includes error field', async () => {
            const response = await request(BASE_URL).get('/test');
            expect(response.body.error).toBe('Endpoint not found');
        });

        test('5.4: includes method and path in message', async () => {
            const response = await request(BASE_URL).get('/test/path');
            expect(response.body.message).toContain('GET /test/path');
            expect(response.body.message).toContain('does not exist');
        });
    });

    describe('CORS Middleware', () => {
        test('6.1: allows requests with Origin header', async () => {
            const response = await request(BASE_URL)
                .get('/health')
                .set('Origin', 'http://localhost:3000');

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        test('6.2: allows credentials', async () => {
            const response = await request(BASE_URL)
                .get('/health')
                .set('Origin', 'http://localhost:3000');

            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });

        test('6.3: handles preflight OPTIONS request', async () => {
            const response = await request(BASE_URL)
                .options('/upload')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'POST');

            expect([200, 204]).toContain(response.status);
            expect(response.headers['access-control-allow-methods']).toBeDefined();
        });

        test('6.4: allows all origins', async () => {
            const origin = 'http://example.com';
            const response = await request(BASE_URL)
                .get('/health')
                .set('Origin', origin);

            expect(response.headers['access-control-allow-origin']).toBe(origin);
        });
    });

    describe('Error Handling', () => {
        test('8.1: handles malformed JSON', async () => {
            const response = await request(BASE_URL)
                .post('/upload')
                .set('Content-Type', 'application/json')
                .send('{broken json');

            // Body-parser error triggers global error handler which returns 500
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });

        test('8.4: error response includes error message', async () => {
            const response = await request(BASE_URL)
                .post('/upload')
                .send({ files: 'invalid' });

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Concurrency & Load', () => {
        test.skip('9.1: handles 10 concurrent requests', async () => {
            // Skipped: Makes 10 LLM API calls - too expensive for CI
            // Concurrency is tested in llm-integration.test.js if needed
        });

        test.skip('9.2: handles concurrent requests without data corruption', async () => {
            // Skipped: Makes 5 LLM API calls - too expensive for CI
            // Concurrency is tested in llm-integration.test.js if needed
        });
    });
});

