const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * LLM Service for AI Code Assistant Backend
 * 
 * Handles communication with the Gemini model.
 * Requires a valid API key and surfaces errors when the service is unavailable.
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
            console.log('⚠️  No Gemini API key found. Gemini responses are disabled until the key is provided.');
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
        if (!this.geminiModel) {
            throw new Error('Gemini model not initialized. Set GEMINI_API_KEY to enable AI responses.');
        }

        try {
            return await this.generateGeminiResponse(prompt, files, currentFile);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Gemini API error:', message);
            throw new Error(`Gemini API error: ${message}`);
        }
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

}

module.exports = LLMService;
