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
        const lowerPrompt = prompt.toLowerCase();
        
        // Analyze file types
        const fileTypes = files.map(f => f.filename?.split('.').pop() || 'unknown');
        const hasReact = fileTypes.includes('tsx') || fileTypes.includes('jsx');
        const hasTypeScript = fileTypes.includes('ts') || fileTypes.includes('tsx');
        const hasJavaScript = fileTypes.includes('js') || fileTypes.includes('jsx');
        const hasPackageJson = files.some(f => f.filename?.includes('package.json'));
        
        // Generate context-aware response
        if (lowerPrompt.includes('summary') || lowerPrompt.includes('repository') || lowerPrompt.includes('repo')) {
            return this.generateRepositorySummary(files, hasReact, hasTypeScript, hasPackageJson);
        } else if (lowerPrompt.includes('explain') || lowerPrompt.includes('what') || lowerPrompt.includes('how')) {
            return this.generateExplanation(files, lowerPrompt);
        } else if (lowerPrompt.includes('generate') || lowerPrompt.includes('create') || lowerPrompt.includes('new')) {
            return this.generateCodeGeneration(files, hasReact, hasTypeScript);
        } else if (lowerPrompt.includes('debug') || lowerPrompt.includes('error') || lowerPrompt.includes('fix')) {
            return this.generateDebuggingResponse(files, lowerPrompt);
        } else if (lowerPrompt.includes('refactor') || lowerPrompt.includes('improve') || lowerPrompt.includes('optimize')) {
            return this.generateRefactoringResponse(files);
        } else {
            return this.generateGeneralResponse(files, lowerPrompt, hasReact, hasTypeScript);
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

    /**
     * Generate repository summary response
     */
    generateRepositorySummary(files, hasReact, hasTypeScript, hasPackageJson) {
        const fileCount = files.length;
        const directoryTree = this.generateDirectoryTree(files);
        const formattedTree = this.formatDirectoryTree(directoryTree);
        
        let response = `Based on your ${fileCount} files, this appears to be a `;
        
        if (hasReact) {
            response += `React-based application`;
            if (hasTypeScript) {
                response += ` built with TypeScript`;
            }
            response += `. The project structure includes:\n\n`;
            
            response += `**Directory Structure:**\n\`\`\`\n${formattedTree}\`\`\`\n\n`;
            
            response += `**Key Components:**\n`;
            response += `• React components for UI structure\n`;
            response += `• State management with React hooks\n`;
            response += `• TypeScript for type safety\n`;
            
            if (hasPackageJson) {
                response += `• Dependencies managed through package.json\n`;
            }
            
            response += `\nThe architecture follows modern React patterns with component-based design.`;
        } else if (hasTypeScript) {
            response += `TypeScript project with ${fileCount} files. The codebase includes:\n\n`;
            
            response += `**Directory Structure:**\n\`\`\`\n${formattedTree}\`\`\`\n\n`;
            
            response += `**Key Features:**\n`;
            response += `• Type definitions for strong typing\n`;
            response += `• Organized module structure\n`;
            response += `• Build configuration\n\n`;
            response += `This project leverages TypeScript's type system for better code quality and maintainability.`;
        } else if (hasJavaScript) {
            response += `JavaScript project with ${fileCount} files. The structure includes:\n\n`;
            
            response += `**Directory Structure:**\n\`\`\`\n${formattedTree}\`\`\`\n\n`;
            
            response += `**Key Features:**\n`;
            response += `• Core JavaScript modules and functions\n`;
            response += `• Configuration files for build tools\n`;
            response += `• External dependencies and packages\n\n`;
            response += `The project uses modern JavaScript features and follows standard conventions.`;
        } else {
            response += `software project with ${fileCount} files. The codebase includes:\n\n`;
            
            response += `**Directory Structure:**\n\`\`\`\n${formattedTree}\`\`\`\n\n`;
            
            response += `**Key Features:**\n`;
            response += `• Source files with application logic\n`;
            response += `• Configuration and build tools\n`;
            response += `• Documentation and guides\n\n`;
            response += `This appears to be a well-organized development project.`;
        }
        
        return `LLM would say: "${response}"`;
    }

    /**
     * Generate explanation response
     */
    generateExplanation(files, prompt) {
        const relevantFiles = files.filter(f => 
            f.filename?.includes('App') || 
            f.filename?.includes('index') || 
            f.filename?.includes('main')
        );
        
        let response = `I'll explain the key aspects of your codebase:\n\n`;
        
        if (relevantFiles.length > 0) {
            response += `**Main Files:**\n`;
            relevantFiles.forEach(file => {
                response += `• ${file.filename}: Core application logic\n`;
            });
            response += `\n`;
        }
        
        response += `**Architecture Overview:**\n`;
        response += `• The project follows a modular structure\n`;
        response += `• Components are organized for maintainability\n`;
        response += `• Configuration files manage build and deployment\n\n`;
        
        response += `**Key Concepts:**\n`;
        response += `• Separation of concerns between different modules\n`;
        response += `• Clear interface definitions and data flow\n`;
        response += `• Proper error handling and validation\n\n`;
        
        response += `Would you like me to dive deeper into any specific file or concept?`;
        
        return `LLM would say: "${response}"`;
    }

    /**
     * Generate code generation response
     */
    generateCodeGeneration(files, hasReact, hasTypeScript) {
        let response = `I'll help you generate new code based on your existing patterns:\n\n`;
        
        if (hasReact) {
            response += `**React Component Generation:**\n`;
            response += `• Create new components following your existing structure\n`;
            response += `• Implement proper TypeScript interfaces\n`;
            response += `• Add necessary imports and exports\n\n`;
            
            response += `**Example Structure:**\n`;
            response += `\`\`\`typescript\n`;
            response += `interface ComponentProps {\n`;
            response += `  // Define props here\n`;
            response += `}\n\n`;
            response += `export function NewComponent({ }: ComponentProps) {\n`;
            response += `  // Component logic here\n`;
            response += `  return (\n`;
            response += `    <div>\n`;
            response += `      {/* JSX content */}\n`;
            response += `    </div>\n`;
            response += `  );\n`;
            response += `}\n`;
            response += `\`\`\`\n\n`;
        } else if (hasTypeScript) {
            response += `**TypeScript Code Generation:**\n`;
            response += `• Create new modules with proper typing\n`;
            response += `• Implement interfaces and types\n`;
            response += `• Follow your existing code patterns\n\n`;
        } else {
            response += `**Code Generation:**\n`;
            response += `• Create new files following your project structure\n`;
            response += `• Implement functions and modules\n`;
            response += `• Maintain consistency with existing code\n\n`;
        }
        
        response += `What specific functionality would you like me to generate?`;
        
        return `LLM would say: "${response}"`;
    }

    /**
     * Generate debugging response
     */
    generateDebuggingResponse(files, prompt) {
        let response = `I'll help you debug your code. Based on your files, here are common debugging approaches:\n\n`;
        
        response += `**Debugging Strategies:**\n`;
        response += `• Check console logs and error messages\n`;
        response += `• Verify data flow between components\n`;
        response += `• Validate input parameters and types\n`;
        response += `• Test edge cases and error conditions\n\n`;
        
        response += `**Common Issues to Check:**\n`;
        response += `• Import/export statements\n`;
        response += `• Variable scope and hoisting\n`;
        response += `• Async/await patterns\n`;
        response += `• Event handler bindings\n\n`;
        
        response += `**Debugging Tools:**\n`;
        response += `• Browser developer tools\n`;
        response += `• VS Code debugger\n`;
        response += `• Console.log statements\n`;
        response += `• Network tab for API calls\n\n`;
        
        response += `Can you provide more specific details about the issue you're experiencing?`;
        
        return `LLM would say: "${response}"`;
    }

    /**
     * Generate refactoring response
     */
    generateRefactoringResponse(files) {
        let response = `I'll help you refactor your code for better maintainability:\n\n`;
        
        response += `**Refactoring Opportunities:**\n`;
        response += `• Extract reusable functions and components\n`;
        response += `• Simplify complex conditional logic\n`;
        response += `• Improve variable and function naming\n`;
        response += `• Reduce code duplication\n\n`;
        
        response += `**Best Practices:**\n`;
        response += `• Single Responsibility Principle\n`;
        response += `• DRY (Don't Repeat Yourself)\n`;
        response += `• Consistent code formatting\n`;
        response += `• Proper error handling\n\n`;
        
        response += `**Performance Improvements:**\n`;
        response += `• Optimize rendering cycles\n`;
        response += `• Implement proper memoization\n`;
        response += `• Reduce unnecessary re-renders\n`;
        response += `• Optimize bundle size\n\n`;
        
        response += `Which specific areas would you like me to help refactor?`;
        
        return `LLM would say: "${response}"`;
    }

    /**
     * Generate general response
     */
    generateGeneralResponse(files, prompt, hasReact, hasTypeScript) {
        const fileCount = files.length;
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
}

module.exports = LLMService;
