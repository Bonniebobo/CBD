const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * LLM Service for AI Code Assistant Backend
 * 
 * Handles communication with various LLM providers including Gemini.
 * Falls back to mock responses when API keys are not available.
 */

class LLMService {
    constructor() {
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.geminiModel = null;

        // Initialize Gemini if API key is available
        if (this.geminiApiKey) {
            try {
                const genAI = new GoogleGenerativeAI(this.geminiApiKey);
                this.geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                console.log('✅ Gemini LLM initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Gemini LLM:', error.message);
                this.geminiApiKey = null;
            }
        } else {
            console.log('⚠️  No Gemini API key found. Using mock responses.');
        }
    }

    /**
     * Generate AI response using available LLM service
     * @param {string} prompt - User's prompt
     * @param {Array} files - Array of files with content
     * @param {string} currentFile - Currently open file (optional)
     * @returns {Promise<string>} AI response
     */
    async generateResponse(prompt, files, currentFile = null) {
        // Try Gemini first if available
        if (this.geminiModel) {
            try {
                return await this.generateGeminiResponse(prompt, files, currentFile);
            } catch (error) {
                console.error('Gemini API error:', error.message);
                console.log('Falling back to mock response...');
            }
        }

        // Fallback to mock response
        return this.generateMockResponse(prompt, files, currentFile);
    }

    /**
     * Generate response using Gemini API
     * @param {string} prompt - User's prompt
     * @param {Array} files - Array of files with content
     * @param {string} currentFile - Currently open file (optional)
     * @returns {Promise<string>} Gemini response
     */
    async generateGeminiResponse(prompt, files, currentFile = null) {
        if (!this.geminiModel) {
            throw new Error('Gemini model not initialized');
        }

        // Prepare context from files
        const fileContext = this.prepareFileContext(files);
        const directoryTree = this.generateDirectoryTree(files);
        const formattedTree = this.formatDirectoryTree(directoryTree);

        // Create system prompt
        const systemPrompt = `You are an AI coding assistant with full access to a user's codebase. You can analyze code, explain functionality, suggest improvements, and help with development tasks.

Current codebase structure:
${formattedTree}

File contents:
${fileContext}

Instructions:
- Provide helpful, accurate, and actionable responses
- Reference specific files and line numbers when relevant
- When citing code, use Markdown links formatted as [label](relative/path:line) so the editor can jump to that location
- Use code blocks for code examples
- Be concise but thorough
- Focus on practical solutions

Current file being edited: ${currentFile || 'None specified'}`;

        // Create user prompt
        const userPrompt = `User question: ${prompt}
Please analyze the provided codebase and respond to the user's question. Include relevant file references and code examples where appropriate.`;

        try {
            const result = await this.geminiModel.generateContent([
                systemPrompt,
                userPrompt
            ]);

            const response = await result.response;
            const text = response.text();

            if (!text) {
                throw new Error('Empty response from Gemini');
            }

            console.log('✅ Gemini response generated successfully');
            return text;

        } catch (error) {
            console.error('Gemini API call failed:', error);
            throw error;
        }
    }

    /**
     * Generate mock response (fallback)
     * @param {string} prompt - User's prompt
     * @param {Array} files - Array of files with content
     * @param {string} currentFile - Currently open file (optional)
     * @returns {string} Mock response
     */
    generateMockResponse(prompt, files, currentFile = null) {
        const promptText = typeof prompt === 'string' ? prompt : '';

        // Analyze file types
        const fileTypes = files.map(f => f.filename?.split('.').pop() || 'unknown');
        const hasReact = fileTypes.includes('tsx') || fileTypes.includes('jsx');
        const hasTypeScript = fileTypes.includes('ts') || fileTypes.includes('tsx');

        // Default to the general response for all prompts
        return this.generateGeneralResponse(files, promptText, hasReact, hasTypeScript);
    }

    /**
     * Prepare file context for LLM
     * @param {Array} files - Array of files with content
     * @returns {string} Formatted file context
     */
    prepareFileContext(files) {
        return files.map(file => {
            const content = file.content || '';
            const lines = content.split('\n');
            const preview = lines.slice(0, 10).join('\n'); // First 10 lines

            return `File: ${file.filename}
${preview}${lines.length > 10 ? '\n...' : ''}
---`;
        }).join('\n\n');
    }

    /**
     * Generate directory tree structure
     * @param {Array} files - Array of files with content
     * @returns {Object} Directory tree
     */
    generateDirectoryTree(files) {
        const tree = {};

        files.forEach(file => {
            if (!file.filename) return;

            const pathParts = file.filename.split('/');
            let current = tree;

            // Build nested structure
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                const isLast = i === pathParts.length - 1;

                if (isLast) {
                    // This is a file
                    const content = file.content || '';
                    const lines = content.split('\n');
                    const firstThreeLines = lines.slice(0, 3).map(line => line.trim()).filter(line => line.length > 0);

                    current[part] = {
                        type: 'file',
                        size: content.length,
                        extension: part.split('.').pop() || 'unknown',
                        preview: firstThreeLines,
                        fullContent: content
                    };
                } else {
                    // This is a directory
                    if (!current[part]) {
                        current[part] = {
                            type: 'directory',
                            children: {}
                        };
                    }
                    current = current[part].children;
                }
            }
        });

        return tree;
    }

    /**
     * Format directory tree as text
     * @param {Object} tree - Directory tree
     * @param {string} indent - Indentation string
     * @returns {string} Formatted tree
     */
    formatDirectoryTree(tree, indent = '') {
        let result = '';

        Object.keys(tree).sort().forEach(key => {
            const item = tree[key];

            if (item.type === 'directory') {
                result += `${indent}📁 ${key}/\n`;
                result += this.formatDirectoryTree(item.children, indent + '  ');
            } else if (item.type === 'file') {
                result += `${indent}📄 ${key} (${item.size} chars, .${item.extension})\n`;
                if (item.preview && item.preview.length > 0) {
                    item.preview.forEach(line => {
                        result += `${indent}   ${line}\n`;
                    });
                }
                result += `${indent}   ...\n`;
            }
        });

        return result;
    }

    /**
     * Generate general response
     */
    generateGeneralResponse(files, prompt, hasReact, hasTypeScript) {
        const fileCount = files.length;
        const keyFileSummaries = this.buildKeyFileReferenceList(files);
        let response = `I understand you're asking about "${prompt}". Based on your ${fileCount} files, I can help you with:\n\n`;

        response += `**Code Analysis:**\n`;
        response += `• Explain how your code works\n`;
        response += `• Identify patterns and structures\n`;
        response += `• Suggest improvements and optimizations\n\n`;

        response += `**Development Assistance:**\n`;
        response += `• Generate new code and components\n`;
        response += `• Debug issues and errors\n`;
        response += `• Refactor existing code\n`;
        response += `• Add new features\n\n`;

        if (hasReact) {
            response += `**React-Specific Help:**\n`;
            response += `• Component architecture and design\n`;
            response += `• State management patterns\n`;
            response += `• Performance optimization\n`;
            response += `• Best practices and conventions\n\n`;
        }

        if (hasTypeScript) {
            response += `**TypeScript Support:**\n`;
            response += `• Type definitions and interfaces\n`;
            response += `• Type safety improvements\n`;
            response += `• Advanced TypeScript features\n\n`;
        }

        if (keyFileSummaries.length > 0) {
            response += `**Key Files with line references:**\n${keyFileSummaries.join('\n')}\n\n`;
        }

        response += `How can I assist you further with your codebase?`;

        return `LLM would say: "${response}"`;
    }

    /**
     * Check if Gemini is available
     * @returns {boolean} True if Gemini is available
     */
    isGeminiAvailable() {
        return !!this.geminiModel;
    }

    /**
     * Get service status
     * @returns {Object} Service status information
     */
    getStatus() {
        return {
            geminiAvailable: this.isGeminiAvailable(),
            geminiApiKey: !!this.geminiApiKey,
            service: 'LLMService'
        };
    }

    /**
     * Build formatted file references with line numbers for summaries
     * @param {Array} files - Array of file objects
     * @returns {Array<string>} Formatted file reference bullets
     */
    buildKeyFileReferenceList(files) {
        if (!Array.isArray(files) || files.length === 0) {
            return [];
        }

        const scoredFiles = files
            .filter(file => file && file.filename && typeof file.content === 'string')
            .map(file => {
                const lineNumber = this.getRepresentativeLineNumber(file.content);
                return {
                    filename: file.filename,
                    lineNumber,
                    description: this.describeFile(file.filename, file.content),
                    score: this.scoreFileForSummary(file.filename, file.content),
                    size: file.content.length
                };
            });

        if (scoredFiles.length === 0) {
            return [];
        }

        const topFiles = scoredFiles
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                if (b.size !== a.size) {
                    return b.size - a.size;
                }
                return a.filename.localeCompare(b.filename);
            })
            .slice(0, 5);

        return topFiles.map(file => {
            const safeLine = Number.isInteger(file.lineNumber) && file.lineNumber > 0 ? file.lineNumber : 1;
            return `• [${file.filename}](${file.filename}:${safeLine}) - ${file.description}`;
        });
    }

    /**
     * Score a file for inclusion in summaries
     * @param {string} filename - File path
     * @param {string} content - File content
     * @returns {number} Score
     */
    scoreFileForSummary(filename, content) {
        const ext = this.getFileExtension(filename);
        const lower = filename.toLowerCase();
        let score = 0;

        const extensionScores = {
            tsx: 6,
            jsx: 5,
            ts: 5,
            js: 4,
            json: 4,
            md: 2,
            css: 2,
            scss: 2,
            html: 2
        };

        if (extensionScores[ext]) {
            score += extensionScores[ext];
        } else {
            score += 1;
        }

        if (lower.endsWith('package.json')) {
            score += 5;
        } else if (lower.includes('/components/') || lower.includes('\\components\\')) {
            score += 2;
        } else if (lower.endsWith('README.md')) {
            score += 3;
        } else if (lower.includes('/tests/') || lower.includes('\\tests\\')) {
            score += 1;
        }

        if (content.includes('useState(') || content.includes('useEffect(')) {
            score += 1;
        }

        return score;
    }

    /**
     * Describe a file based on its name and content
     * @param {string} filename - File path
     * @param {string} content - File content
     * @returns {string} Description
     */
    describeFile(filename, content) {
        const lower = filename.toLowerCase();
        const ext = this.getFileExtension(filename);

        if (lower.endsWith('package.json')) {
            return 'Project dependencies and scripts';
        }
        if (lower.endsWith('tsconfig.json')) {
            return 'TypeScript compiler configuration';
        }
        if (lower.endsWith('README.md')) {
            return 'Documentation overview';
        }
        if (lower.includes('/services/') || lower.includes('\\services\\')) {
            return 'Service logic for backend features';
        }
        if (lower.includes('/components/') || lower.includes('\\components\\')) {
            return 'UI component';
        }

        switch (ext) {
            case 'tsx':
                return content.includes('export default') ?
                    'React component entry point' :
                    'React component';
            case 'jsx':
                return 'React component';
            case 'ts':
                return 'TypeScript module';
            case 'js':
                return 'JavaScript module';
            case 'json':
                return 'Configuration file';
            case 'md':
                return 'Markdown documentation';
            case 'css':
            case 'scss':
                return 'Styling definitions';
            case 'html':
                return 'HTML template';
            default:
                return 'Source file';
        }
    }

    /**
     * Determine a representative line number for a file
     * @param {string} content - File content
     * @returns {number} Line number (1-based)
     */
    getRepresentativeLineNumber(content) {
        if (typeof content !== 'string' || content.length === 0) {
            return 1;
        }

        const lines = content.split(/\r?\n/);
        let inBlockComment = false;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            if (trimmed.length === 0) {
                continue;
            }

            if (inBlockComment) {
                if (trimmed.includes('*/')) {
                    inBlockComment = false;
                }
                continue;
            }

            if (trimmed.startsWith('/*')) {
                if (!trimmed.includes('*/')) {
                    inBlockComment = true;
                }
                continue;
            }

            if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
                continue;
            }

            if (trimmed.startsWith('import ') || trimmed.startsWith('export {')) {
                continue;
            }

            return i + 1;
        }

        return 1;
    }

    /**
     * Extract file extension
     * @param {string} filename - File path
     * @returns {string} File extension without dot
     */
    getFileExtension(filename) {
        if (typeof filename !== 'string') {
            return '';
        }

        const lastDot = filename.lastIndexOf('.');
        if (lastDot === -1 || lastDot === filename.length - 1) {
            return '';
        }

        return filename.slice(lastDot + 1).toLowerCase();
    }
}

module.exports = LLMService;
