import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Configuration constants for the AI Chatbot webview
 */
const CONFIG = {
    VIEW_TYPE: 'ai-chatbot.webview',
    PANEL_TITLE: 'AI Chatbot Assistant',
    CHAT_HISTORY_KEY: 'ai-chatbot.chatHistory',
    VIEW_COLUMN: vscode.ViewColumn.Two,
    FILE_OPEN_COLUMN: vscode.ViewColumn.One,
    LOAD_DELAY_MS: 100,
    SAVE_DELAY_MS: 100,
    WEBVIEW_REQUEST_DELAY_MS: 200
} as const;

/**
 * Message types for communication between webview and extension
 */
const MESSAGE_TYPES = {
    SEND_MESSAGE: 'sendMessage',
    GET_WORKSPACE_FILES: 'getWorkspaceFiles',
    GET_CURRENT_FILE: 'getCurrentFile',
    OPEN_FILE: 'openFile',
    SAVE_CHAT_HISTORY: 'saveChatHistory',
    REQUEST_CHAT_HISTORY: 'requestChatHistory',
    AI_RESPONSE: 'aiResponse',
    WORKSPACE_FILES: 'workspaceFiles',
    CURRENT_FILE: 'currentFile',
    LOAD_CHAT_HISTORY: 'loadChatHistory',
    INITIAL_MESSAGE: 'initialMessage'
} as const;

/**
 * AI Chatbot Webview Provider
 * 
 * Manages the VS Code webview panel for the AI Chatbot Assistant.
 * Handles communication between the extension and the webview,
 * chat history persistence, and file navigation.
 */
export class ChatWebviewProvider implements vscode.Disposable {
    public static readonly viewType = CONFIG.VIEW_TYPE;
    
    private _panel: vscode.WebviewPanel | undefined;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;

    constructor(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._extensionUri = extensionUri;
        this._context = context;
    }

    /**
     * Creates a new webview panel or shows an existing one
     * @param initialMessage Optional initial message to display
     */
    public createOrShow(initialMessage?: string): void {
        if (this._tryRevealExistingPanel(initialMessage)) {
            return;
        }

        this._createNewPanel(initialMessage);
    }

    /**
     * Restores a webview panel from serialized state
     * @param panel The webview panel to restore
     * @param state Serialized state (unused)
     */
    public restore(panel: vscode.WebviewPanel, state: any): void {
        this._panel = panel;
        this._setupWebview(panel);
        this._setupMessageHandlers(panel);
        this._loadChatHistoryWithDelay();
    }

    /**
     * Disposes of the webview provider
     */
    public dispose(): void {
        this._panel?.dispose();
        this._panel = undefined;
    }

    /**
     * Attempts to reveal an existing panel
     * @param initialMessage Optional initial message
     * @returns true if panel was revealed, false if new panel needed
     */
    private _tryRevealExistingPanel(initialMessage?: string): boolean {
        if (!this._panel) {
            return false;
        }

        console.log(`[AI Chatbot] Panel already exists, revealing in column ${CONFIG.VIEW_COLUMN}`);
        
        try {
            this._panel.reveal(CONFIG.VIEW_COLUMN);
            if (initialMessage) {
                this._sendMessageToWebview({
                    type: MESSAGE_TYPES.INITIAL_MESSAGE,
                    message: initialMessage
                });
            }
            return true;
        } catch (error) {
            console.log(`[AI Chatbot] Panel is disposed, creating new one: ${error}`);
            this._panel = undefined;
            return false;
        }
    }

    /**
     * Creates a new webview panel
     * @param initialMessage Optional initial message
     */
    private _createNewPanel(initialMessage?: string): void {
        console.log(`[AI Chatbot] Creating new panel in column ${CONFIG.VIEW_COLUMN}`);

        // Clear chat history when creating a new panel
        this._clearChatHistory();

        this._panel = vscode.window.createWebviewPanel(
            ChatWebviewProvider.viewType,
            CONFIG.PANEL_TITLE,
            CONFIG.VIEW_COLUMN,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionUri, 'out')
                ]
            }
        );

        this._setupWebview(this._panel);
        this._setupMessageHandlers(this._panel);
        this._setupPanelEventHandlers(this._panel);

        if (initialMessage) {
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.INITIAL_MESSAGE,
                message: initialMessage
            });
        }

        this._loadChatHistoryWithDelay();
    }

    /**
     * Sets up the webview HTML content
     * @param panel The webview panel
     */
    private _setupWebview(panel: vscode.WebviewPanel): void {
        panel.webview.html = this._getHtmlForWebview(panel.webview);
    }

    /**
     * Sets up message handlers for the webview
     * @param panel The webview panel
     */
    private _setupMessageHandlers(panel: vscode.WebviewPanel): void {
        panel.webview.onDidReceiveMessage(
            async (message) => this._handleWebviewMessage(message),
            null
        );
    }

    /**
     * Sets up panel event handlers
     * @param panel The webview panel
     */
    private _setupPanelEventHandlers(panel: vscode.WebviewPanel): void {
        // Handle panel disposal
        panel.onDidDispose(() => {
            console.log(`[AI Chatbot] Panel disposed`);
            this._panel = undefined;
        }, null);

        // Handle view state changes
        panel.onDidChangeViewState((e) => {
            console.log(`[AI Chatbot] Panel view state changed: visible=${e.webviewPanel.visible}, active=${e.webviewPanel.active}`);
            if (e.webviewPanel.visible && e.webviewPanel.active) {
                this._loadChatHistory();
            }
        }, null);
    }

    /**
     * Handles messages from the webview
     * @param message The message from the webview
     */
    private async _handleWebviewMessage(message: any): Promise<void> {
        switch (message.type) {
            case MESSAGE_TYPES.SEND_MESSAGE:
                await this._handleUserMessage(message.text);
                break;
            case MESSAGE_TYPES.GET_WORKSPACE_FILES:
                this._sendWorkspaceFiles();
                break;
            case MESSAGE_TYPES.GET_CURRENT_FILE:
                this._sendCurrentFile();
                break;
            case MESSAGE_TYPES.OPEN_FILE:
                await this._openFile(message.fileName, message.lineNumber);
                break;
            case MESSAGE_TYPES.SAVE_CHAT_HISTORY:
                this._saveChatHistory(message.messages);
                break;
            case MESSAGE_TYPES.REQUEST_CHAT_HISTORY:
                this._loadChatHistory();
                break;
        }
    }

    /**
     * Handles user messages and generates AI responses
     * @param text The user's message text
     */
    private async _handleUserMessage(text: string): Promise<void> {
        if (!this._panel) {
            return;
        }

        // Get workspace context
        const workspaceFiles = await this._getWorkspaceFiles();
        const currentFile = this._getCurrentFile();

        // Generate AI response
        const response = await this._generateAIResponse(text, workspaceFiles, currentFile);

        this._sendMessageToWebview({
            type: MESSAGE_TYPES.AI_RESPONSE,
            response: response
        });
    }

    /**
     * Generates AI responses based on user input
     * @param message The user's message
     * @param workspaceFiles Available workspace files
     * @param currentFile Currently open file
     * @returns AI response string
     */
    private async _generateAIResponse(message: string, workspaceFiles: string[], currentFile?: string): Promise<string> {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('summary') || lowerMessage.includes('repository') || lowerMessage.includes('repo')) {
            return this._generateRepositorySummary(workspaceFiles, currentFile);
        } else if (lowerMessage.includes('explain') || lowerMessage.includes('what') || lowerMessage.includes('how')) {
            return this._generateExplanationResponse(currentFile, workspaceFiles);
        } else if (lowerMessage.includes('generate') || lowerMessage.includes('create') || lowerMessage.includes('new')) {
            return this._generateCodeGenerationResponse(workspaceFiles);
        } else {
            return this._generateGeneralResponse(message, workspaceFiles, currentFile);
        }
    }

    /**
     * Generates a repository summary response
     * @param workspaceFiles Available workspace files
     * @param currentFile Currently open file
     * @returns Repository summary string
     */
    private _generateRepositorySummary(workspaceFiles: string[], currentFile?: string): string {
        const hasReact = workspaceFiles.some(f => f.includes('App.tsx') || f.includes('index.tsx'));
        const hasComponents = workspaceFiles.some(f => f.includes('components/'));
        const hasTypes = workspaceFiles.some(f => f.includes('types/') || f.includes('.ts'));
        const hasPackageJson = workspaceFiles.some(f => f.includes('package.json'));
        
        // Find actual file paths in the workspace
        const headerFile = workspaceFiles.find(f => f.includes('Header.tsx'));
        const sidebarFile = workspaceFiles.find(f => f.includes('Sidebar.tsx'));
        const chatInterfaceFile = workspaceFiles.find(f => f.includes('ChatInterface.tsx'));
        const appFile = workspaceFiles.find(f => f.includes('App.tsx'));
        const packageFile = workspaceFiles.find(f => f.includes('package.json'));
        
        if (hasReact && hasComponents) {
            return `This is a VS Code extension project for an AI coding assistant. The main components include:

• React Components: [Header component](${headerFile || 'src/components/Header.tsx'}:8), [Sidebar navigation](${sidebarFile || 'src/components/Sidebar.tsx'}:12), and [ChatInterface](${chatInterfaceFile || 'src/components/ChatInterface.tsx'}:45) for the UI
• Core Logic: Main [App function](${appFile || 'src/App.tsx'}:9) with [useState hooks](${appFile || 'src/App.tsx'}:10) for state management
• Package Configuration: Standard VS Code extension setup with OpenAI integration in [package.json](${packageFile || 'package.json'}:15)

The architecture follows a typical VS Code extension pattern with a clean React-based interface defined in the [default export](${appFile || 'src/App.tsx'}:23).`;
        } else if (hasTypes) {
            return `This appears to be a TypeScript project. The main files include:

• TypeScript files with type definitions and interfaces
• Configuration files for build and development
• Source code organized in a structured manner

The project uses TypeScript for type safety and modern JavaScript features.`;
        } else if (hasPackageJson) {
            return `This is a Node.js project with package.json configuration. The project structure includes:

• Package dependencies and scripts
• Configuration files for various tools
• Source code files

The project follows standard Node.js conventions with package management through npm.`;
        } else {
            return `This workspace contains various files and directories. The structure includes:

• Multiple file types and formats
• Organized directory structure
• Configuration and source files

The workspace appears to be a development project with mixed file types and purposes.`;
        }
    }

    /**
     * Generates an explanation response
     * @param currentFile Currently open file
     * @param workspaceFiles Available workspace files
     * @returns Explanation response string
     */
    private _generateExplanationResponse(currentFile?: string, workspaceFiles?: string[]): string {
        if (currentFile) {
            return `Looking at the current file [${currentFile}](${currentFile}:1), this appears to be part of a larger project structure.

The file is located in the workspace and contains code that contributes to the overall functionality. To provide a more detailed explanation, I would need to examine the specific content and context of this file.

Would you like me to analyze a specific part of this file or explain how it relates to other components in the project?`;
        } else {
            return `I can help explain various aspects of your codebase. To provide the most relevant explanation, please:

1. Open a specific file you'd like me to explain
2. Ask about a particular concept or pattern
3. Request clarification on how different parts of your code work together

What specific aspect would you like me to explain?`;
        }
    }

    /**
     * Generates a code generation response
     * @param workspaceFiles Available workspace files
     * @returns Code generation response string
     */
    private _generateCodeGenerationResponse(workspaceFiles: string[]): string {
        const hasReact = workspaceFiles.some(f => f.includes('App.tsx') || f.includes('index.tsx'));
        const hasComponents = workspaceFiles.some(f => f.includes('components/'));
        
        if (hasReact && hasComponents) {
            return `I can help you generate code for your React-based VS Code extension. Here are some common code generation tasks:

• **New React Component**: Create a new component with proper TypeScript types
• **VS Code Extension Command**: Add a new command to your extension
• **Webview Integration**: Set up communication between extension and webview
• **Configuration Settings**: Add extension configuration options

What specific code would you like me to generate? For example:
- "Generate a new React component called UserProfile"
- "Create a VS Code command for file analysis"
- "Add a configuration setting for API endpoints"`;
        } else {
            return `I can help you generate code for your project. Based on your workspace structure, I can assist with:

• **File Templates**: Create new files with proper structure
• **Configuration Files**: Generate config files for various tools
• **Code Snippets**: Create reusable code patterns
• **Documentation**: Generate README files and documentation

What type of code would you like me to generate? Please specify:
- The type of file or component
- The programming language or framework
- Any specific requirements or patterns you need`;
        }
    }

    /**
     * Generates a general response
     * @param message The user's message
     * @param workspaceFiles Available workspace files
     * @param currentFile Currently open file
     * @returns General response string
     */
    private _generateGeneralResponse(message: string, workspaceFiles: string[], currentFile?: string): string {
        return `I understand you're asking about "${message}". 

I can help you with various tasks related to your codebase:

• **Code Analysis**: Explain how your code works
• **Repository Summary**: Provide an overview of your project structure
• **Code Generation**: Create new files, components, or functions
• **File Navigation**: Help you find and open specific files
• **Debugging**: Assist with troubleshooting issues

Your workspace contains ${workspaceFiles.length} files${currentFile ? `, and you're currently working on [${currentFile}](${currentFile}:1)` : ''}.

How can I assist you further?`;
    }

    /**
     * Opens a file in the editor
     * @param fileName The file name to open
     * @param lineNumber Optional line number to navigate to
     */
    private async _openFile(fileName: string, lineNumber?: number): Promise<void> {
        try {
            let document: vscode.TextDocument | undefined;
            
            // First try to find the file in the workspace
            const workspaceFiles = await this._getWorkspaceFiles();
            const matchingFile = workspaceFiles.find(file => 
                file.endsWith(fileName) || file.includes(fileName)
            );
            
            if (matchingFile) {
                // Get the workspace folder to construct the absolute path
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    const workspaceFolder = vscode.workspace.workspaceFolders[0];
                    const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, matchingFile);
                    
                    try {
                        document = await vscode.workspace.openTextDocument(absolutePath);
                    } catch (e) {
                        // Continue to fallback
                    }
                }
            }
            
            if (!document) {
                // Fallback: try the file name directly (in case it's already an absolute path)
                try {
                    document = await vscode.workspace.openTextDocument(fileName);
                } catch (error) {
                    throw new Error(`File not found: ${fileName}`);
                }
            }
            
            if (document) {
                // Open the file in the left panel to keep the chat on the right
                const editor = await vscode.window.showTextDocument(document, CONFIG.FILE_OPEN_COLUMN);
                
                if (lineNumber) {
                    const position = new vscode.Position(lineNumber - 1, 0);
                    editor.selection = new vscode.Selection(position, position);
                    editor.revealRange(new vscode.Range(position, position));
                }
            }
        } catch (error) {
            // Show a helpful error message
            vscode.window.showWarningMessage(
                `File not found in current workspace: ${fileName}. Please ensure the file exists or open the correct workspace.`,
                'OK'
            );
        }
    }

    /**
     * Gets workspace files
     * @returns Array of workspace file paths
     */
    private async _getWorkspaceFiles(): Promise<string[]> {
        const files: string[] = [];
        
        if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
                const pattern = new vscode.RelativePattern(folder, '**/*');
                const fileUris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
                const relativePaths = fileUris.map(uri => vscode.workspace.asRelativePath(uri));
                files.push(...relativePaths);
            }
        }
        
        return files.slice(0, 100); // Limit to first 100 files
    }

    /**
     * Gets the currently open file
     * @returns Current file path or undefined
     */
    private _getCurrentFile(): string | undefined {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return vscode.workspace.asRelativePath(editor.document.uri);
        }
        return undefined;
    }

    /**
     * Sends workspace files to the webview
     */
    private _sendWorkspaceFiles(): void {
        this._getWorkspaceFiles().then(files => {
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.WORKSPACE_FILES,
                files: files
            });
        });
    }

    /**
     * Sends current file information to the webview
     */
    private _sendCurrentFile(): void {
        const currentFile = this._getCurrentFile();
        this._sendMessageToWebview({
            type: MESSAGE_TYPES.CURRENT_FILE,
            file: currentFile
        });
    }

    /**
     * Sends a message to the webview
     * @param message The message to send
     */
    private _sendMessageToWebview(message: any): void {
        if (this._panel) {
            this._panel.webview.postMessage(message);
        }
    }

    /**
     * Loads chat history from storage
     */
    private _loadChatHistory(): void {
        if (!this._panel) return;
        
        const chatHistory = this._context.globalState.get(CONFIG.CHAT_HISTORY_KEY, []);
        console.log(`[AI Chatbot] Loading chat history:`, chatHistory.length, 'messages');
        
        if (chatHistory.length > 0) {
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.LOAD_CHAT_HISTORY,
                messages: chatHistory
            });
        }
    }

    /**
     * Loads chat history with a delay to ensure webview is ready
     */
    private _loadChatHistoryWithDelay(): void {
        setTimeout(() => {
            this._loadChatHistory();
        }, CONFIG.LOAD_DELAY_MS);
    }

    /**
     * Saves chat history to storage
     * @param messages Array of chat messages
     */
    private _saveChatHistory(messages: any[]): void {
        this._context.globalState.update(CONFIG.CHAT_HISTORY_KEY, messages);
        console.log(`[AI Chatbot] Saved chat history:`, messages.length, 'messages');
    }

    /**
     * Clears chat history from storage
     */
    private _clearChatHistory(): void {
        this._context.globalState.update(CONFIG.CHAT_HISTORY_KEY, []);
        console.log(`[AI Chatbot] Cleared chat history for new panel`);
    }

    /**
     * Generates HTML content for the webview
     * @param webview The webview instance
     * @returns HTML string
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Try to load the built React app first
        const reactAppPath = vscode.Uri.joinPath(this._extensionUri, 'out', 'index.html');
        
        try {
            if (fs.existsSync(reactAppPath.fsPath)) {
                let html = fs.readFileSync(reactAppPath.fsPath, 'utf8');
                
                // Update resource paths to work with webview
                html = html.replace(
                    /src="([^"]*\.js)"/g,
                    (match, src) => `src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', src))}"`
                );
                html = html.replace(
                    /href="([^"]*\.css)"/g,
                    (match, href) => `href="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', href))}"`
                );
                
                // Inject VS Code API
                html = html.replace(
                    '</head>',
                    `
                    <script>
                        const vscode = acquireVsCodeApi();
                        
                        // Global functions for VS Code integration
                        window.setInitialMessage = function(message) {
                            const input = document.getElementById('messageInput');
                            if (input) input.value = message;
                        };
                        
                        window.addAIResponse = function(response) {
                            // This will be handled by the React app
                            if (window.addMessage) {
                                window.addMessage('ai', response);
                            }
                        };
                        
                        window.setWorkspaceFiles = function(files) {
                            // This will be handled by the React app
                            if (window.updateWorkspaceFiles) {
                                window.updateWorkspaceFiles(files);
                            }
                        };
                        
                        window.setCurrentFile = function(file) {
                            // This will be handled by the React app
                            if (window.updateCurrentFile) {
                                window.updateCurrentFile(file);
                            }
                        };
                    </script>
                    </head>`
                );
                
                return html;
            }
        } catch (error) {
            console.log(`[AI Chatbot] Failed to load React app, using fallback: ${error}`);
        }
        
        // Fallback to inline HTML
        return this._getFallbackHtml(webview);
    }

    /**
     * Generates fallback HTML content for the webview
     * @param webview The webview instance
     * @returns HTML string
     */
    private _getFallbackHtml(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Chatbot Assistant</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                
                .header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .header h1 {
                    margin: 0;
                    font-size: 18px;
                    color: var(--vscode-foreground);
                }
                
                .header .subtitle {
                    margin-left: 10px;
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                }
                
                .messages {
                    flex: 1;
                    overflow-y: auto;
                    margin-bottom: 20px;
                    padding: 10px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    background-color: var(--vscode-input-background);
                }
                
                .message {
                    display: flex;
                    margin-bottom: 15px;
                    align-items: flex-start;
                }
                
                .message-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 10px;
                    font-size: 16px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                    border: 1px solid var(--vscode-panel-border);
                }
                
                .message-content {
                    flex: 1;
                    min-width: 0;
                }
                
                .message-text {
                    line-height: 1.4;
                    word-wrap: break-word;
                }
                
                .message-line {
                    margin-bottom: 8px;
                }
                
                .line-content {
                    line-height: 1.4;
                    word-wrap: break-word;
                    margin-bottom: 4px;
                }
                
                .line-citations {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: 4px;
                }
                
                .file-reference {
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    cursor: pointer;
                    font-family: var(--vscode-editor-font-family);
                    transition: all 0.2s ease;
                }
                
                .file-reference:hover {
                    background-color: var(--vscode-list-hoverBackground);
                    border-color: var(--vscode-focusBorder);
                    transform: translateY(-1px);
                }
                
                .file-link {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: underline;
                    cursor: pointer;
                    transition: color 0.2s ease;
                }
                
                .file-link:hover {
                    color: var(--vscode-textLink-activeForeground);
                    text-decoration: none;
                }
                
                .input-container {
                    display: flex;
                    gap: 10px;
                }
                
                .message-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                }
                
                .message-input:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                }
                
                .send-button {
                    padding: 8px 16px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    transition: all 0.2s ease;
                }
                
                .send-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                    transform: translateY(-1px);
                }
                
                .send-button:disabled {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    cursor: not-allowed;
                    transform: none;
                }
                
                .status-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-top: 1px solid var(--vscode-panel-border);
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .status-text {
                    flex: 1;
                }
                
                .status-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .status-button {
                    background: none;
                    border: none;
                    color: var(--vscode-textLink-foreground);
                    cursor: pointer;
                    font-size: 12px;
                    text-decoration: underline;
                    transition: color 0.2s ease;
                }
                
                .status-button:hover {
                    color: var(--vscode-textLink-activeForeground);
                    text-decoration: none;
                }
                
                ul, ol {
                    margin: 8px 0;
                    padding-left: 20px;
                }
                
                li {
                    margin: 4px 0;
                    line-height: 1.4;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🤖 AI Assistant</h1>
                <span class="subtitle">Repository-aware coding assistant</span>
            </div>
            
            <div id="messages" class="messages">
                <div class="message">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <div class="message-text">Hello! I'm your AI coding assistant. I have full awareness of your repository and can help you with code generation, explanations, and refactoring. What would you like to work on?</div>
                    </div>
                </div>
            </div>
            
            <div class="input-container">
                <input type="text" id="messageInput" class="message-input" placeholder="Ask me anything about your code..." />
                <button id="sendButton" class="send-button">Send</button>
            </div>
            
            <div class="status-bar">
                <div id="statusText" class="status-text">Ready to help</div>
                <div class="status-actions">
                    <button class="status-button" onclick="clearChat()">Clear Chat</button>
                    <button class="status-button" onclick="exportChat()">Export</button>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function sendMessage() {
                    const input = document.getElementById('messageInput');
                    const message = input.value.trim();
                    
                    if (message) {
                        addMessage('user', message);
                        input.value = '';
                        
                        // Send message to extension
                        vscode.postMessage({
                            type: '${MESSAGE_TYPES.SEND_MESSAGE}',
                            text: message
                        });
                    }
                }
                
                function addMessage(type, content) {
                    addMessageWithParsing(type, content, true);
                }
                
                function addMessageWithParsing(type, content, saveHistory = false) {
                    const container = document.getElementById('messages');
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message';
                    
                    const avatar = document.createElement('div');
                    avatar.className = 'message-avatar';
                    avatar.textContent = type === 'user' ? '👤' : '🤖';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'message-content';
                    
                    if (type === 'ai') {
                        // Store the raw content for saving
                        messageDiv.setAttribute('data-raw-content', content);
                        
                        // Use enhanced parsing for AI messages with citations
                        const parsedLines = parseContentWithCitations(content);
                        parsedLines.forEach(lineDiv => {
                            contentDiv.appendChild(lineDiv);
                        });
                    } else {
                        // Simple parsing for user messages
                        const textDiv = document.createElement('div');
                        textDiv.className = 'message-text';
                        textDiv.innerHTML = parseContent(content);
                        contentDiv.appendChild(textDiv);
                    }
                    
                    messageDiv.appendChild(avatar);
                    messageDiv.appendChild(contentDiv);
                    container.appendChild(messageDiv);
                    container.scrollTop = container.scrollHeight;
                    
                    // Save chat history after adding a message (only for new messages, not when loading)
                    if (saveHistory) {
                        setTimeout(() => saveChatHistory(), ${CONFIG.SAVE_DELAY_MS});
                    }
                }
                
                function parseContent(text) {
                    // Parse file references like [text](file:line)
                    return text.replace(/\\[([^\\]]+)\\]\\(([^:)]+):?(\\d+)?\\)/g, (match, linkText, fileName, lineNumber) => {
                        return \`<span class="file-link" onclick="openFile('\${fileName}', \${lineNumber || 'null'})">\${linkText}</span>\`;
                    });
                }
                
                function parseContentWithCitations(text) {
                    const lines = text.split('\\n');
                    const result = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const lineReferences = [];
                        
                        // Find all file references in this line
                        const linkRegex = /\\[([^\\]]+)\\]\\(([^:)]+):?(\\d+)?\\)/g;
                        let match;
                        let lastIndex = 0;
                        let lineContent = '';
                        
                        while ((match = linkRegex.exec(line)) !== null) {
                            // Add text before the link
                            if (match.index > lastIndex) {
                                lineContent += line.slice(lastIndex, match.index);
                            }
                            
                            // Add the clickable link
                            const linkText = match[1];
                            const fileName = match[2];
                            const lineNumber = match[3];
                            
                            lineContent += \`<span class="file-link" onclick="openFile('\${fileName}', \${lineNumber || 'null'})">\${linkText}</span>\`;
                            
                            // Store reference for per-line citation
                            if (lineNumber) {
                                lineReferences.push({
                                    fileName: fileName,
                                    lineNumber: lineNumber,
                                    linkText: linkText
                                });
                            }
                            
                            lastIndex = match.index + match[0].length;
                        }
                        
                        // Add remaining text
                        if (lastIndex < line.length) {
                            lineContent += line.slice(lastIndex);
                        }
                        
                        // Create the line with content and citations
                        const lineDiv = document.createElement('div');
                        lineDiv.className = 'message-line';
                        
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'line-content';
                        contentDiv.innerHTML = lineContent || line;
                        
                        lineDiv.appendChild(contentDiv);
                        
                        // Add per-line citation buttons
                        if (lineReferences.length > 0) {
                            const citationsDiv = document.createElement('div');
                            citationsDiv.className = 'line-citations';
                            
                            lineReferences.forEach(ref => {
                                const citationBtn = document.createElement('button');
                                citationBtn.className = 'file-reference';
                                citationBtn.innerHTML = \`📄 \${ref.fileName}:\${ref.lineNumber}\`;
                                citationBtn.onclick = () => openFile(ref.fileName, ref.lineNumber);
                                citationsDiv.appendChild(citationBtn);
                            });
                            
                            lineDiv.appendChild(citationsDiv);
                        }
                        
                        result.push(lineDiv);
                    }
                    
                    return result;
                }
                
                function openFile(fileName, lineNumber) {
                    vscode.postMessage({
                        type: '${MESSAGE_TYPES.OPEN_FILE}',
                        fileName: fileName,
                        lineNumber: lineNumber
                    });
                }
                
                // Handle Enter key
                document.getElementById('messageInput').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                });
                
                // Handle send button
                document.getElementById('sendButton').addEventListener('click', sendMessage);
                
                // Listen for messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case '${MESSAGE_TYPES.AI_RESPONSE}':
                            addMessage('ai', message.response);
                            break;
                        case '${MESSAGE_TYPES.WORKSPACE_FILES}':
                            updateStatus(\`\${message.files ? message.files.length : 0} files indexed • \${getCurrentFileStatus()}\`);
                            break;
                        case '${MESSAGE_TYPES.CURRENT_FILE}':
                            updateStatus(\`\${getWorkspaceStatus()} • \${message.file ? 'Editing ' + message.file : 'No file selected'}\`);
                            break;
                        case '${MESSAGE_TYPES.LOAD_CHAT_HISTORY}':
                            loadChatHistory(message.messages);
                            break;
                        case '${MESSAGE_TYPES.REQUEST_CHAT_HISTORY}':
                            // This is handled by the extension, not the webview
                            break;
                    }
                });
                
                function updateStatus(text) {
                    const statusText = document.getElementById('statusText');
                    if (statusText) {
                        statusText.textContent = text;
                    }
                }
                
                function getWorkspaceStatus() {
                    // This would be updated by the workspaceFiles message
                    return 'Repository indexed';
                }
                
                function getCurrentFileStatus() {
                    // This would be updated by the currentFile message
                    return 'No file selected';
                }
                
                function loadChatHistory(messages) {
                    console.log('[AI Chatbot] Webview: Loading chat history', messages.length, 'messages');
                    const container = document.getElementById('messages');
                    if (container && messages && messages.length > 0) {
                        // Clear existing messages except the initial AI greeting
                        const initialMessage = container.querySelector('.message');
                        container.innerHTML = '';
                        if (initialMessage) {
                            container.appendChild(initialMessage);
                        }
                        
                        // Load saved messages
                        messages.forEach(msg => {
                            console.log('[AI Chatbot] Webview: Loading message:', msg.type, msg.content.substring(0, 100) + '...');
                            addMessageWithParsing(msg.type, msg.content);
                        });
                        console.log('[AI Chatbot] Webview: Chat history loaded successfully');
                    } else {
                        console.log('[AI Chatbot] Webview: No chat history to load');
                    }
                }
                
                function saveChatHistory() {
                    const container = document.getElementById('messages');
                    if (container) {
                        const messages = [];
                        const messageElements = container.querySelectorAll('.message');
                        messageElements.forEach((element, index) => {
                            // Skip the first message (initial AI greeting)
                            if (index === 0) return;
                            
                            const avatar = element.querySelector('.message-avatar');
                            if (avatar) {
                                const type = avatar.textContent === '👤' ? 'user' : 'ai';
                                
                                if (type === 'user') {
                                    // For user messages, get the simple text content
                                    const content = element.querySelector('.message-text');
                                    if (content) {
                                        messages.push({
                                            type: type,
                                            content: content.textContent || content.innerHTML
                                        });
                                    }
                                } else {
                                    // For AI messages, use the stored raw content
                                    const rawContent = element.getAttribute('data-raw-content');
                                    if (rawContent) {
                                        messages.push({
                                            type: type,
                                            content: rawContent
                                        });
                                    }
                                }
                            }
                        });
                        
                        if (messages.length > 0) {
                            console.log('[AI Chatbot] Webview: Saving chat history', messages.length, 'messages');
                            vscode.postMessage({
                                type: '${MESSAGE_TYPES.SAVE_CHAT_HISTORY}',
                                messages: messages
                            });
                        }
                    }
                }
                
                function clearChat() {
                    const container = document.getElementById('messages');
                    if (container) {
                        // Keep only the initial AI greeting
                        const initialMessage = container.querySelector('.message');
                        container.innerHTML = '';
                        if (initialMessage) {
                            container.appendChild(initialMessage);
                        }
                        saveChatHistory();
                    }
                }
                
                function exportChat() {
                    const container = document.getElementById('messages');
                    if (container) {
                        const messages = [];
                        const messageElements = container.querySelectorAll('.message');
                        messageElements.forEach(element => {
                            const avatar = element.querySelector('.message-avatar');
                            const content = element.querySelector('.message-text, .line-content');
                            if (avatar && content) {
                                const type = avatar.textContent === '👤' ? 'User' : 'AI';
                                messages.push(\`\${type}: \${content.textContent}\`);
                            }
                        });
                        
                        const chatText = messages.join('\\n\\n');
                        const blob = new Blob([chatText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'chat-history.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                }
                
                // Request workspace information
                vscode.postMessage({ type: '${MESSAGE_TYPES.GET_WORKSPACE_FILES}' });
                vscode.postMessage({ type: '${MESSAGE_TYPES.GET_CURRENT_FILE}' });
                
                // Request chat history on webview load
                setTimeout(() => {
                    vscode.postMessage({ type: '${MESSAGE_TYPES.REQUEST_CHAT_HISTORY}' });
                }, ${CONFIG.WEBVIEW_REQUEST_DELAY_MS});
            </script>
        </body>
        </html>`;
    }
}