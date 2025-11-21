// frontend/ai-chatbot-extension/tests/frontend-backend.integration.spec.ts

import { expect } from 'chai';
import sinon from 'sinon';

// NOTE: we require Node-style modules from the backend side
// so we use require() for those.
const http = require('http');
const LLMService = require('../../../backend/services/llmService');
const createBackendApp = require('../../../backend/index.js');

// Frontend function under test
import { callBackendAPI } from '../src/backendClient';
import type { WorkspaceFile } from '../src/types';

describe('Frontend ↔ Backend integration: callBackendAPI + /upload', function () {
    // LLM calls and HTTP spin-up can take a bit
    this.timeout(10_000);

    let sandbox: sinon.SinonSandbox;
    let server: any;
    let baseUrl: string;

    /**
     * Helper: start backend server on a random port with
     * configurable LLM behavior (success / fail).
     */
    async function startBackend(llmMode: 'success' | 'fail'): Promise<void> {
        // Patch LLMService *before* creating / using the Express app
        if (llmMode === 'success') {
            sandbox.stub(LLMService.prototype, 'generateResponse')
                .callsFake(async (prompt: string, files: any[]) => {
                    return `Mock AI response for: ${prompt}`;
                });

            sandbox.stub(LLMService.prototype, 'generateDirectoryTree')
                .callsFake((files: any[]) => ({
                    mocked: true,
                    filesCount: files.length,
                }));
        } else {
            // Simulate a hard failure from Gemini / LLM layer
            sandbox.stub(LLMService.prototype, 'generateResponse')
                .rejects(new Error('Simulated failure'));

            sandbox.stub(LLMService.prototype, 'generateDirectoryTree')
                .callsFake((files: any[]) => ({
                    mocked: true,
                    filesCount: files.length,
                }));
        }

        const app = createBackendApp; // index.js exports the Express app instance
        await new Promise<void>((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                const address = server.address() as { port: number };
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    }

    /**
     * Helper: start a lightweight stub server that always returns
     * HTTP 200 with an error payload in the JSON body.
     */
    async function startErrorPayloadServer(): Promise<void> {
        await new Promise<void>((resolve) => {
            server = http.createServer((req: any, res: any) => {
                if (req.method === 'POST' && req.url === '/upload') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Upstream LLM quota exceeded' }));
                    return;
                }

                res.writeHead(404);
                res.end();
            }).listen(0, '127.0.0.1', () => {
                const address = server.address() as { port: number };
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    }

    /**
     * Helper: start a stub server that returns 200 with no AI content
     * in the JSON body (aiResponse/message not usable strings).
     */
    async function startNoContentServer(): Promise<void> {
        await new Promise<void>((resolve) => {
            server = http.createServer((req: any, res: any) => {
                if (req.method === 'POST' && req.url === '/upload') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        message: 123,
                        aiResponse: null,
                        otherField: 'present but not AI text',
                    }));
                    return;
                }

                res.writeHead(404);
                res.end();
            }).listen(0, '127.0.0.1', () => {
                const address = server.address() as { port: number };
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    }

    /**
     * Helper: start a stub server that returns 200 with an invalid JSON body.
     */
    async function startInvalidJsonServer(): Promise<void> {
        await new Promise<void>((resolve) => {
            server = http.createServer((req: any, res: any) => {
                if (req.method === 'POST' && req.url === '/upload') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('<<< not json >>>');
                    return;
                }

                res.writeHead(404);
                res.end();
            }).listen(0, '127.0.0.1', () => {
                const address = server.address() as { port: number };
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    }

    async function stopBackend(): Promise<void> {
        if (!server) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            server.close((err: unknown) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        server = undefined;
    }

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        await stopBackend();
        sandbox.restore();
    });

    /**
     * IA1 – Happy path:
     * Frontend sends prompt + valid files, backend returns aiResponse,
     * callBackendAPI resolves with that string.
     */
    it('IA1: returns AI response for valid prompt and files (happy path)', async () => {
        await startBackend('success');

        const files: WorkspaceFile[] = [
            {
                filename: 'src/index.ts',
                content: "console.log('hello');",
            },
        ];

        const prompt = 'Summarize this project.';

        const result = await callBackendAPI(prompt, files, baseUrl);

        // We stubbed LLMService to return this format
        expect(result).to.equal(`Mock AI response for: ${prompt}`);
    });

    /**
     * IA2 – Validation error:
     * Frontend passes invalid `files` payload (null), backend returns 400,
     * callBackendAPI rejects with a Backend API error indicating 400.
     */
    it('IA2: propagates 400 validation error when files payload is invalid', async () => {
        await startBackend('success'); // LLM behavior irrelevant here

        const prompt = 'Help me with this code.';
        const invalidFiles: any = null; // intentionally invalid to trigger backend validation

        let caughtError: unknown;
        try {
            await callBackendAPI(prompt, invalidFiles, baseUrl);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.instanceOf(Error);
        const message = (caughtError as Error).message;

        // Shape depends on backend, but should contain status code 400
        expect(message).to.match(/Backend API error:/);
        expect(message).to.match(/400/);
    });

    /**
     * IA3 – AI failure → 500:
     * Stub LLMService to throw, backend returns 500 with AI service error,
     * callBackendAPI rejects with Backend API error indicating 500.
     */
    it('IA3: propagates 500 AI service error when LLM layer fails', async () => {
        await startBackend('fail');

        const files: WorkspaceFile[] = [
            {
                filename: 'app.js',
                content: 'function main() {}',
            },
        ];

        const prompt = 'Explain the architecture.';

        let caughtError: unknown;
        try {
            await callBackendAPI(prompt, files, baseUrl);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.instanceOf(Error);
        const message = (caughtError as Error).message;

        // Should indicate an HTTP 500 error
        expect(message).to.match(/Backend API error:/);
        expect(message).to.match(/500/);

        // Optionally, ensure we actually triggered the failing stub
        const generateResponseStub = (LLMService.prototype.generateResponse as unknown as sinon.SinonStub);
        expect(generateResponseStub.called).to.be.true;
    });

    /**
     * IA4 – 2xx with error in JSON:
     * Backend responds 200 but payload.error is set; callBackendAPI
     * should treat this as an application-level failure.
     */
    it('IA4: rejects when backend returns 200 with error payload', async () => {
        await startErrorPayloadServer();

        const files: WorkspaceFile[] = [
            {
                filename: 'src/index.ts',
                content: "console.log('test');",
            },
        ];

        const prompt = 'Test error payload';

        let caughtError: unknown;
        try {
            await callBackendAPI(prompt, files, baseUrl);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.instanceOf(Error);
        expect((caughtError as Error).message).to.contain('Upstream LLM quota exceeded');
    });

    /**
     * IA5 – 2xx with no AI content:
     * Backend returns 200 with JSON missing any usable AI text.
     * callBackendAPI should reject with the "no AI content" error.
     */
    it('IA5: rejects when backend returns 200 with no AI content', async () => {
        await startNoContentServer();

        const files: WorkspaceFile[] = [
            {
                filename: 'empty.js',
                content: '',
            },
        ];

        const prompt = 'Test missing AI content';

        let caughtError: unknown;
        try {
            await callBackendAPI(prompt, files, baseUrl);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.instanceOf(Error);
        expect((caughtError as Error).message).to.equal('Backend response received but no AI content was provided.');
    });

    /**
     * IA6 – 2xx with invalid JSON body:
     * Backend returns 200 but the body is not valid JSON.
     * callBackendAPI should reject with an "Invalid response from backend" error.
     */
    it('IA6: rejects when backend returns 200 with invalid JSON', async () => {
        await startInvalidJsonServer();

        const files: WorkspaceFile[] = [
            {
                filename: 'index.ts',
                content: 'const x = 1;',
            },
        ];

        const prompt = 'Test invalid JSON';

        let caughtError: unknown;
        try {
            await callBackendAPI(prompt, files, baseUrl);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.instanceOf(Error);
        expect((caughtError as Error).message).to.match(/^Invalid response from backend:/);
    });

    /**
     * IA7 – Network error / backend unreachable:
     * Backend URL cannot be reached; callBackendAPI should surface the network error.
     */
    it('IA7: rejects when backend is unreachable (network error)', async () => {
        const unreachableUrl = 'http://127.0.0.1:3999';

        const files: WorkspaceFile[] = [
            {
                filename: 'main.ts',
                content: "console.log('hi');",
            },
        ];

        const prompt = 'Is anyone there?';

        let caughtError: unknown;
        try {
            await callBackendAPI(prompt, files, unreachableUrl);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.instanceOf(Error);
        const msg = (caughtError as Error).message;
        expect(msg).to.match(/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/i);
    });
});
