import * as vscode from 'vscode';
import * as fs from 'fs';
import { CONFIG, getLocalResourceRoots } from './config';
import {
    ChatMessage,
    ExtensionToWebviewMessage,
    MESSAGE_TYPES,
    WebviewToExtensionMessage,
    WorkspaceFile,
    assertUnreachable,
} from './types';
import { createChatStateStore, ChatStateStore } from './stateStore';
import { callBackendAPI } from './backendClient';
import {
    getActiveEditorPath,
    getWorkspaceFiles,
    getWorkspaceFilesWithContent,
    isTextFile,
    openFileInEditor,
} from './fileHelpers';

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
    private readonly _stateStore: ChatStateStore;

    constructor(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._extensionUri = extensionUri;
        this._context = context;
        this._stateStore = createChatStateStore(context);
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
     * @param _state Serialized state (unused)
     */
    public restore(panel: vscode.WebviewPanel, _state: unknown): void {
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
                    payload: { message: initialMessage },
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
                localResourceRoots: getLocalResourceRoots(this._extensionUri),
            },
        );

        this._setupWebview(this._panel);
        this._setupMessageHandlers(this._panel);
        this._setupPanelEventHandlers(this._panel);

        if (initialMessage) {
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.INITIAL_MESSAGE,
                payload: { message: initialMessage },
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
            null,
        );
    }

    /**
     * Sets up panel event handlers
     * @param panel The webview panel
     */
    private _setupPanelEventHandlers(panel: vscode.WebviewPanel): void {
        // Handle panel disposal
        panel.onDidDispose(() => {
            console.log('[AI Chatbot] Panel disposed');
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
    private async _handleWebviewMessage(message: WebviewToExtensionMessage): Promise<void> {
        switch (message.type) {
            case MESSAGE_TYPES.SEND_MESSAGE:
                await this._handleUserMessage(message.payload.text);
                break;
            case MESSAGE_TYPES.GET_WORKSPACE_FILES:
                this._sendWorkspaceFiles();
                break;
            case MESSAGE_TYPES.GET_CURRENT_FILE:
                this._sendCurrentFile();
                break;
            case MESSAGE_TYPES.OPEN_FILE:
                await this._openFile(message.payload.fileName, message.payload.lineNumber);
                break;
            case MESSAGE_TYPES.SAVE_CHAT_HISTORY:
                this._saveChatHistory(message.payload.messages);
                break;
            case MESSAGE_TYPES.REQUEST_CHAT_HISTORY:
                this._loadChatHistory();
                break;
            default:
                assertUnreachable(message.type);
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

        try {
            // Show loading state
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.AI_RESPONSE,
                payload: { response: '🤖 Analyzing your codebase... Please wait.' },
            });

            // Get workspace context with file contents
            const workspaceFiles = await this._getWorkspaceFilesWithContent();

            // Call backend API
            const response = await this._callBackendAPI(text, workspaceFiles);

            this._sendMessageToWebview({
                type: MESSAGE_TYPES.AI_RESPONSE,
                payload: { response },
            });
        } catch (error) {
            console.error('[AI Chatbot] Error handling user message:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.AI_RESPONSE,
                payload: { response: `⚠️ Failed to contact the Gemini backend: ${errorMessage}` },
            });
        }
    }

    /**
     * Opens a file in the editor
     * @param fileName The file name to open
     * @param lineNumber Optional line number to navigate to
     */
    private async _openFile(fileName: string, lineNumber?: number): Promise<void> {
        try {
            await openFileInEditor(fileName, lineNumber, CONFIG.FILE_OPEN_COLUMN);
        } catch (error) {
            vscode.window.showWarningMessage(
                `File not found in current workspace: ${fileName}. Please ensure the file exists or open the correct workspace.`,
                'OK',
            );
            console.warn('[AI Chatbot] Failed to open file from webview command:', error);
        }
    }

    /**
     * Gets workspace files
     * @returns Array of workspace file paths
     */
    private _getWorkspaceFiles(): Promise<string[]> {
        return getWorkspaceFiles();
    }

    /**
     * Gets workspace files with their content for backend API
     * @returns Array of workspace files with content
     */
    private _getWorkspaceFilesWithContent(): Promise<WorkspaceFile[]> {
        return getWorkspaceFilesWithContent({
            fileFilter: (filename) => this._isTextFile(filename),
        });
    }

    /**
     * Checks if a file is a text file based on extension
     * @param filename The filename to check
     * @returns true if the file is likely a text file
     */
    private _isTextFile(filename: string): boolean {
        return isTextFile(filename);
    }

    /**
     * Calls the backend API with files and prompt
     * @param prompt The user's prompt
     * @param files Array of files with content
     * @returns AI response from backend
     */
    private async _callBackendAPI(prompt: string, files: WorkspaceFile[]): Promise<string> {
        const backendUrl = vscode.workspace
            .getConfiguration('ai-chatbot')
            .get<string>('backendUrl', CONFIG.DEFAULT_BACKEND_URL);

        console.log(`[AI Chatbot] Calling backend API at ${backendUrl}`);
        console.log(`[AI Chatbot] Sending ${files.length} files with prompt: "${prompt}"`);

        return callBackendAPI(prompt, files, backendUrl);
    }

    /**
     * Gets the currently open file
     * @returns Current file path or undefined
     */
    private _getCurrentFile(): string | undefined {
        return getActiveEditorPath();
    }

    /**
     * Sends workspace files to the webview
     */
    private _sendWorkspaceFiles(): void {
        this._getWorkspaceFiles().then(files => {
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.WORKSPACE_FILES,
                payload: { files },
            });
        }).catch(error => console.error('[AI Chatbot] Failed to gather workspace files for webview:', error));
    }

    /**
     * Sends current file information to the webview
     */
    private _sendCurrentFile(): void {
        const currentFile = this._getCurrentFile();
        this._sendMessageToWebview({
            type: MESSAGE_TYPES.CURRENT_FILE,
            payload: { file: currentFile },
        });
    }

    /**
     * Sends a message to the webview
     * @param message The message to send
     */
    private _sendMessageToWebview(message: ExtensionToWebviewMessage): void {
        this._panel?.webview.postMessage(message);
    }

    /**
     * Loads chat history from storage
     */
    private _loadChatHistory(): void {
        if (!this._panel) {return;}

        const chatHistory = this._stateStore.getChatHistory();
        console.log('[AI Chatbot] Loading chat history:', chatHistory.length, 'messages');

        if (chatHistory.length > 0) {
            this._sendMessageToWebview({
                type: MESSAGE_TYPES.LOAD_CHAT_HISTORY,
                payload: { messages: chatHistory },
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
    private _saveChatHistory(messages: ChatMessage[]): void {
        void this._stateStore.saveChatHistory(messages);
        console.log('[AI Chatbot] Saved chat history:', messages.length, 'messages');
    }

    /**
     * Clears chat history from storage
     */
    private _clearChatHistory(): void {
        void this._stateStore.clearChatHistory();
        console.log('[AI Chatbot] Cleared chat history for new panel');
    }

    /**
     * Generates HTML content for the webview
     * @param webview The webview instance
     * @returns HTML string
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webviewClient.js'),
        );
        const reactAppPath = vscode.Uri.joinPath(this._extensionUri, 'out', 'index.html');

        try {
            if (fs.existsSync(reactAppPath.fsPath)) {
                let html = fs.readFileSync(reactAppPath.fsPath, 'utf8');

                html = html.replace(
                    /src="([^"]*\.js)"/g,
                    (_match, src) => `src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', src))}"`,
                );
                html = html.replace(
                    /href="([^"]*\.css)"/g,
                    (_match, href) => `href="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', href))}"`,
                );

                html = html.replace(
                    '</body>',
                    `    <script src="${scriptUri}"></script>\n</body>`,
                );

                return html;
            }
        } catch (error) {
            console.log(`[AI Chatbot] Failed to load React app, using fallback: ${error}`);
        }

        return this._getFallbackHtml(webview, scriptUri.toString());
    }

    /**
     * Generates fallback HTML content for the webview
     * @param _webview The webview instance
     * @returns HTML string
     */
    private _getFallbackHtml(_webview: vscode.Webview, scriptSrc: string): string {
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
            
            <script src="${scriptSrc}"></script>
        </body>
        </html>`;
    }
}
