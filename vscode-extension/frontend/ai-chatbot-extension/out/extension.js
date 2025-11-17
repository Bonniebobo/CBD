"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const chatViewProvider_1 = require("./chatViewProvider");
const chatWebviewProvider_1 = require("./chatWebviewProvider");
function activate(context) {
    console.log('AI Chatbot Extension is now active!');
    // Create providers
    const chatViewProvider = new chatViewProvider_1.ChatViewProvider(context.extensionUri);
    const chatWebviewProvider = new chatWebviewProvider_1.ChatWebviewProvider(context.extensionUri, context);
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
        }
        else {
            chatWebviewProvider.createOrShow();
        }
    });
    // Register webview panel serializer for persistence
    const webviewSerializer = vscode.window.registerWebviewPanelSerializer('ai-chatbot.webview', {
        deserializeWebviewPanel(webviewPanel, state) {
            chatWebviewProvider.restore(webviewPanel, state);
            return Promise.resolve();
        },
    });
    // Add to subscriptions
    context.subscriptions.push(chatView, openChatCommand, openChatInEditorCommand, webviewSerializer, chatViewProvider, chatWebviewProvider);
}
exports.activate = activate;
function deactivate() {
    console.log('AI Chatbot Extension is now deactivated!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map