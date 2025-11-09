import * as vscode from 'vscode';

export const CONFIG = {
    VIEW_TYPE: 'ai-chatbot.webview',
    PANEL_TITLE: 'AI Chatbot Assistant',
    CHAT_HISTORY_KEY: 'ai-chatbot.chatHistory',
    VIEW_COLUMN: vscode.ViewColumn.Two,
    FILE_OPEN_COLUMN: vscode.ViewColumn.One,
    LOAD_DELAY_MS: 100,
    SAVE_DELAY_MS: 100,
    WEBVIEW_REQUEST_DELAY_MS: 200,
    BACKEND_URL_SETTING: 'ai-chatbot.backendUrl',
    DEFAULT_BACKEND_URL: 'http://localhost:3001',
} as const;

export function getLocalResourceRoots(extensionUri: vscode.Uri): vscode.Uri[] {
    return [
        vscode.Uri.joinPath(extensionUri, 'out'),
        vscode.Uri.joinPath(extensionUri, 'resources'),
    ];
}
