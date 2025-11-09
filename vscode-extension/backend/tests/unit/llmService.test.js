/**
 * Unit Tests for LLMService
 *
 * Tests the LLMService class functions in isolation with no API calls.
 * Uses Jest for testing framework and mocking.
 */

const LLMService = require('../../services/llmService');

// ==================== CONSOLE OUTPUT CONTROL ====================
// Set to true to see all console logs during testing (useful for debugging)
// Set to false for clean test output (default)
const SHOW_CONSOLE_LOGS = false;
// ================================================================

describe('LLMService', () => {
    const consoleSpies = {};

    // Suppress all console output by default (unless SHOW_CONSOLE_LOGS is true)
    beforeAll(() => {
        if (!SHOW_CONSOLE_LOGS) {
            consoleSpies.log = jest.spyOn(console, 'log').mockImplementation(() => {});
            consoleSpies.error = jest.spyOn(console, 'error').mockImplementation(() => {});
            consoleSpies.warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        }
    });

    afterAll(() => {
        if (!SHOW_CONSOLE_LOGS) {
            consoleSpies.log?.mockRestore();
            consoleSpies.error?.mockRestore();
            consoleSpies.warn?.mockRestore();
        }
    });

    // Clean up environment after each test
    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.GEMINI_API_KEY;
    });

    describe('constructor()', () => {
        test('1.1: handles missing API key gracefully', () => {
            delete process.env.GEMINI_API_KEY;
            const service = new LLMService();

            expect(service.geminiApiKey).toBeNull();
            expect(service.geminiModel).toBeNull();
        });

        test('1.2: handles invalid API key format (empty string)', () => {
            process.env.GEMINI_API_KEY = '';
            const service = new LLMService();

            expect(service.geminiApiKey).toBeFalsy();
            expect(service.geminiModel).toBeNull();
        });

        test('1.3: logs warning when no API key', () => {
            // This test verifies console logging, so temporarily restore console if suppressed
            if (!SHOW_CONSOLE_LOGS) {
                consoleSpies.log.mockRestore();
            }

            const consoleSpy = jest.spyOn(console, 'log');
            delete process.env.GEMINI_API_KEY;

            new LLMService();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('⚠️'),
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('No Gemini API key found'),
            );

            consoleSpy.mockRestore();

            // Re-suppress if needed
            if (!SHOW_CONSOLE_LOGS) {
                consoleSpies.log = jest.spyOn(console, 'log').mockImplementation(() => {});
            }
        });
    });

    describe('prepareFileContext()', () => {
        let service;

        beforeEach(() => {
            service = new LLMService();
        });

        test('3.1: formats single file correctly', () => {
            const files = [{
                filename: 'test.js',
                content: 'line1\nline2\nline3',
            }];

            const result = service.prepareFileContext(files);

            expect(result).toContain('File: test.js');
            expect(result).toContain('line1');
            expect(result).toContain('line2');
            expect(result).toContain('line3');
            expect(result).toContain('---');
        });

        test('3.2: handles multiple files', () => {
            const files = [
                { filename: 'a.js', content: 'a' },
                { filename: 'b.js', content: 'b' },
            ];

            const result = service.prepareFileContext(files);

            expect(result).toContain('File: a.js');
            expect(result).toContain('File: b.js');
            expect(result.split('\n\n').length).toBeGreaterThan(1);
        });

        test('3.3: limits preview to 10 lines', () => {
            const content = Array(15).fill(0).map((_, i) => `line${i + 1}`).join('\n');
            const files = [{ filename: 'test.js', content }];

            const result = service.prepareFileContext(files);

            expect(result).toContain('line1');
            expect(result).toContain('line10');
            expect(result).toContain('...');
            expect(result).not.toContain('line15');
        });

        test('3.4: handles empty file content', () => {
            const files = [{ filename: 'empty.js', content: '' }];

            const result = service.prepareFileContext(files);

            expect(result).toContain('File: empty.js');
            expect(result).toContain('---');
        });

        test('3.5: handles files without content property', () => {
            const files = [{ filename: 'test.js' }];

            expect(() => service.prepareFileContext(files)).not.toThrow();
            const result = service.prepareFileContext(files);
            expect(result).toContain('File: test.js');
        });

        test('3.6: handles empty files array', () => {
            const files = [];

            const result = service.prepareFileContext(files);

            expect(result).toBe('');
        });
    });

    describe('generateDirectoryTree()', () => {
        let service;

        beforeEach(() => {
            service = new LLMService();
        });

        test('4.1: creates flat structure for root-level files', () => {
            const files = [{ filename: 'test.js', content: 'content' }];

            const tree = service.generateDirectoryTree(files);

            expect(tree['test.js']).toBeDefined();
            expect(tree['test.js'].type).toBe('file');
        });

        test('4.2: creates nested structure for subdirectories', () => {
            const files = [{ filename: 'src/app.js', content: 'content' }];

            const tree = service.generateDirectoryTree(files);

            expect(tree.src).toBeDefined();
            expect(tree.src.type).toBe('directory');
            expect(tree.src.children['app.js']).toBeDefined();
        });

        test('4.3: includes file metadata', () => {
            const files = [{ filename: 'test.js', content: 'hello' }];

            const tree = service.generateDirectoryTree(files);

            expect(tree['test.js']).toHaveProperty('size', 5);
            expect(tree['test.js']).toHaveProperty('extension', 'js');
            expect(tree['test.js']).toHaveProperty('preview');
            expect(tree['test.js']).toHaveProperty('fullContent', 'hello');
        });

        test('4.4: extracts up to 3 trimmed non-empty lines for preview', () => {
            const files = [{
                filename: 'test.js',
                content: 'line1\n\nline2\nline3\nline4',
            }];

            const tree = service.generateDirectoryTree(files);

            expect(tree['test.js'].preview).toEqual(['line1', 'line2', 'line3']);
            expect(tree['test.js'].preview.length).toBe(3);
        });

        test('4.5: preview may have fewer than 3 items when filtered', () => {
            const files = [{
                filename: 'test.js',
                content: '\n\nline1\n\n',
            }];

            const tree = service.generateDirectoryTree(files);

            expect(tree['test.js'].preview).toEqual(['line1']);
            expect(tree['test.js'].preview.length).toBe(1);
        });

        test('4.6: handles multiple levels of nesting', () => {
            const files = [{ filename: 'src/components/Button.tsx', content: 'code' }];

            const tree = service.generateDirectoryTree(files);

            expect(tree.src).toBeDefined();
            expect(tree.src.children.components).toBeDefined();
            expect(tree.src.children.components.children['Button.tsx']).toBeDefined();
        });

        test('4.7: handles files without filename', () => {
            const files = [{ content: 'content' }];

            const tree = service.generateDirectoryTree(files);

            expect(tree).toEqual({});
        });

        test('4.8: handles empty files array', () => {
            const files = [];

            const tree = service.generateDirectoryTree(files);

            expect(tree).toEqual({});
        });

        test('4.9: determines file extension correctly', () => {
            const files = [{ filename: 'test.tsx', content: '' }];

            const tree = service.generateDirectoryTree(files);

            expect(tree['test.tsx'].extension).toBe('tsx');
        });

        test('4.10: handles files with no extension', () => {
            const files = [{ filename: 'Makefile', content: '' }];

            const tree = service.generateDirectoryTree(files);

            expect(tree.Makefile.extension).toBe('Makefile');
        });

        test('4.11: handles multiple files in same directory', () => {
            const files = [
                { filename: 'a.js', content: 'a' },
                { filename: 'b.js', content: 'b' },
            ];

            const tree = service.generateDirectoryTree(files);

            expect(tree['a.js']).toBeDefined();
            expect(tree['b.js']).toBeDefined();
        });
    });

    describe('formatDirectoryTree()', () => {
        let service;

        beforeEach(() => {
            service = new LLMService();
        });

        test('5.1: formats flat file structure', () => {
            const tree = {
                'test.js': { type: 'file', size: 10, extension: 'js', preview: [] },
            };

            const result = service.formatDirectoryTree(tree, '');

            expect(result).toContain('📄 test.js (10 chars, .js)');
        });

        test('5.2: formats directory structure', () => {
            const tree = {
                src: { type: 'directory', children: {} },
            };

            const result = service.formatDirectoryTree(tree, '');

            expect(result).toContain('📁 src/');
        });

        test('5.3: recursively indents nested items', () => {
            const tree = {
                src: {
                    type: 'directory',
                    children: {
                        'app.js': { type: 'file', size: 10, extension: 'js', preview: [] },
                    },
                },
            };

            const result = service.formatDirectoryTree(tree, '');

            expect(result).toContain('📁 src/');
            expect(result).toContain('  📄 app.js');
        });

        test('5.4: includes file previews', () => {
            const tree = {
                'test.js': {
                    type: 'file',
                    size: 10,
                    extension: 'js',
                    preview: ['line1', 'line2'],
                },
            };

            const result = service.formatDirectoryTree(tree, '');

            expect(result).toContain('line1');
            expect(result).toContain('line2');
        });

        test('5.5: sorts keys alphabetically', () => {
            const tree = {
                'z.js': { type: 'file', size: 1, extension: 'js', preview: [] },
                'a.js': { type: 'file', size: 1, extension: 'js', preview: [] },
            };

            const result = service.formatDirectoryTree(tree, '');

            const aIndex = result.indexOf('a.js');
            const zIndex = result.indexOf('z.js');
            expect(aIndex).toBeLessThan(zIndex);
        });

        test('5.6: handles empty tree', () => {
            const tree = {};

            const result = service.formatDirectoryTree(tree, '');

            expect(result).toBe('');
        });

        test('5.7: uses custom indent', () => {
            const tree = {
                'test.js': { type: 'file', size: 10, extension: 'js', preview: [] },
            };

            const result = service.formatDirectoryTree(tree, '  ');

            expect(result).toMatch(/^ {2}/);
        });
    });

    describe('isGeminiAvailable()', () => {
        test('6.1: returns false when model is not initialized', () => {
            delete process.env.GEMINI_API_KEY;
            const service = new LLMService();

            expect(service.isGeminiAvailable()).toBe(false);
        });

        test('6.2: returns true when model exists', () => {
            const service = new LLMService();
            // Mock a geminiModel to exist
            service.geminiModel = { generateContent: jest.fn() };

            expect(service.isGeminiAvailable()).toBe(true);
        });
    });

    describe('getStatus()', () => {
        test('7.1: returns complete status object', () => {
            const service = new LLMService();

            const status = service.getStatus();

            expect(status).toHaveProperty('geminiAvailable');
            expect(status).toHaveProperty('geminiApiKey');
            expect(status).toHaveProperty('service');
        });

        test('7.2: reports correct geminiAvailable when model doesn\'t exist', () => {
            delete process.env.GEMINI_API_KEY;
            const service = new LLMService();

            const status = service.getStatus();

            expect(status.geminiAvailable).toBe(false);
        });

        test('7.3: reports correct geminiApiKey when key doesn\'t exist', () => {
            delete process.env.GEMINI_API_KEY;
            const service = new LLMService();

            const status = service.getStatus();

            expect(status.geminiApiKey).toBe(false);
        });

        test('7.4: always reports service name', () => {
            const service = new LLMService();

            const status = service.getStatus();

            expect(status.service).toBe('LLMService');
        });
    });

    describe('generateResponse()', () => {
        test('2.1: throws error when model not initialized', async () => {
            delete process.env.GEMINI_API_KEY;
            const service = new LLMService();

            await expect(service.generateResponse('test', []))
                .rejects.toThrow('Gemini model not initialized');
        });

        test('2.2: delegates to generateGeminiResponse', async () => {
            const service = new LLMService();
            service.geminiModel = { generateContent: jest.fn() };
            service.generateGeminiResponse = jest.fn().mockResolvedValue('result');

            const result = await service.generateResponse('test', [], null);

            expect(result).toBe('result');
            expect(service.generateGeminiResponse).toHaveBeenCalledWith('test', [], null);
        });

        test('2.3: wraps errors with descriptive message', async () => {
            const service = new LLMService();
            service.geminiModel = { generateContent: jest.fn() };
            service.generateGeminiResponse = jest.fn().mockRejectedValue(
                new Error('API failed'),
            );

            await expect(service.generateResponse('test', []))
                .rejects.toThrow('Gemini API error: API failed');
        });

        test('2.4: handles non-Error exceptions', async () => {
            const service = new LLMService();
            service.geminiModel = { generateContent: jest.fn() };
            service.generateGeminiResponse = jest.fn().mockRejectedValue('string error');

            await expect(service.generateResponse('test', []))
                .rejects.toThrow('Gemini API error: string error');
        });

        test('2.5: logs errors to console', async () => {
            // This test verifies error logging, so temporarily restore console.error
            if (!SHOW_CONSOLE_LOGS) {
                consoleSpies.error.mockRestore();
            }

            const consoleSpy = jest.spyOn(console, 'error');
            const service = new LLMService();
            service.geminiModel = { generateContent: jest.fn() };
            service.generateGeminiResponse = jest.fn().mockRejectedValue(
                new Error('Test error'),
            );

            try {
                await service.generateResponse('test', []);
            } catch {
                // Expected error
            }

            expect(consoleSpy).toHaveBeenCalledWith(
                'Gemini API error:', 'Test error',
            );

            consoleSpy.mockRestore();

            // Re-suppress if needed
            if (!SHOW_CONSOLE_LOGS) {
                consoleSpies.error = jest.spyOn(console, 'error').mockImplementation(() => {});
            }
        });
    });

    describe('generateGeminiResponse()', () => {
        test('8.1: successfully generates response', async () => {
            const service = new LLMService();
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: {
                    text: () => 'AI response text',
                },
            });
            service.geminiModel = { generateContent: mockGenerateContent };

            const result = await service.generateGeminiResponse('test', []);

            expect(result).toBe('AI response text');
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        test('8.2: throws error on empty response', async () => {
            const service = new LLMService();
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: {
                    text: () => '',
                },
            });
            service.geminiModel = { generateContent: mockGenerateContent };

            await expect(service.generateGeminiResponse('test', []))
                .rejects.toThrow('Empty response from Gemini');
        });

        test('8.3: handles API call failure', async () => {
            // This test verifies error logging, so temporarily restore console.error
            if (!SHOW_CONSOLE_LOGS) {
                consoleSpies.error.mockRestore();
            }

            const consoleSpy = jest.spyOn(console, 'error');
            const service = new LLMService();
            const mockGenerateContent = jest.fn().mockRejectedValue(
                new Error('API error'),
            );
            service.geminiModel = { generateContent: mockGenerateContent };

            await expect(service.generateGeminiResponse('test', []))
                .rejects.toThrow('API error');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Gemini API call failed:', expect.any(Error),
            );

            consoleSpy.mockRestore();

            // Re-suppress if needed
            if (!SHOW_CONSOLE_LOGS) {
                consoleSpies.error = jest.spyOn(console, 'error').mockImplementation(() => {});
            }
        });

        test('8.4: includes file context in prompt', async () => {
            const service = new LLMService();
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: { text: () => 'response' },
            });
            service.geminiModel = { generateContent: mockGenerateContent };

            const files = [{ filename: 'test.js', content: 'code' }];
            await service.generateGeminiResponse('test', files);

            const callArgs = mockGenerateContent.mock.calls[0][0];
            expect(callArgs[0]).toContain('File: test.js');
            expect(callArgs[0]).toContain('code');
        });

        test('8.5: includes directory tree in prompt', async () => {
            const service = new LLMService();
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: { text: () => 'response' },
            });
            service.geminiModel = { generateContent: mockGenerateContent };

            const files = [{ filename: 'test.js', content: 'code' }];
            await service.generateGeminiResponse('test', files);

            const callArgs = mockGenerateContent.mock.calls[0][0];
            expect(callArgs[0]).toContain('📄 test.js');
        });

        test('8.6: includes currentFile in prompt', async () => {
            const service = new LLMService();
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: { text: () => 'response' },
            });
            service.geminiModel = { generateContent: mockGenerateContent };

            await service.generateGeminiResponse('test', [], 'current.js');

            const callArgs = mockGenerateContent.mock.calls[0][0];
            expect(callArgs[0]).toContain('Current file being edited: current.js');
        });
    });
});

