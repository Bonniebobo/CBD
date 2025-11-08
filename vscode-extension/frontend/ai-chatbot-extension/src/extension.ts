import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { ChatWebviewProvider } from './chatWebviewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Chatbot Extension is now active!');

    // Create providers
    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    const chatWebviewProvider = new ChatWebviewProvider(context.extensionUri, context);

    // Register the chat view
    const chatView = vscode.window.createTreeView('ai-chatbot.chatView', {
        treeDataProvider: chatViewProvider,
        showCollapseAll: true,
    });

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('ai-chatbot.openChat', () => {
        chatWebviewProvider.createOrShow();
    });

    const openChatInEditorCommand = vscode.commands.registerCommand('ai-chatbot.openChatInEditor', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selectedText = editor.document.getText(editor.selection);
            chatWebviewProvider.createOrShow(selectedText);
        } else {
            chatWebviewProvider.createOrShow();
        }
    });

    // Register webview panel serializer for persistence
    const webviewSerializer = vscode.window.registerWebviewPanelSerializer('ai-chatbot.webview', {
        deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: unknown): Thenable<void> {
            chatWebviewProvider.restore(webviewPanel, state);
            return Promise.resolve();
        },
    });

    // Add to subscriptions
    context.subscriptions.push(
        chatView,
        openChatCommand,
        openChatInEditorCommand,
        webviewSerializer,
        chatViewProvider,
        chatWebviewProvider,
    );
}

export function deactivate() {
    console.log('AI Chatbot Extension is now deactivated!');
}
