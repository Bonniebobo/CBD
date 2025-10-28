"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewItem = exports.ChatViewProvider = void 0;
const vscode = require("vscode");
class ChatViewProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve([
                new ChatViewItem('Open AI Chat', 'Start a new conversation with the Gemini-powered assistant', vscode.TreeItemCollapsibleState.None, {
                    command: 'ai-chatbot.openChat',
                    title: 'Open AI Chat',
                    arguments: []
                })
            ]);
        }
        return Promise.resolve([]);
    }
    dispose() {
        this._onDidChangeTreeData.dispose();
    }
}
exports.ChatViewProvider = ChatViewProvider;
class ChatViewItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.iconPath = {
            light: vscode.Uri.joinPath(vscode.Uri.file(__dirname), '..', '..', 'resources', 'light', 'chat.svg'),
            dark: vscode.Uri.joinPath(vscode.Uri.file(__dirname), '..', '..', 'resources', 'dark', 'chat.svg')
        };
        this.tooltip = description;
        this.description = description;
    }
}
exports.ChatViewItem = ChatViewItem;
//# sourceMappingURL=chatViewProvider.js.map