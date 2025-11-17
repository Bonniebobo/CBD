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
exports.ChatViewItem = exports.ChatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
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
                    arguments: [],
                }),
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
            dark: vscode.Uri.joinPath(vscode.Uri.file(__dirname), '..', '..', 'resources', 'dark', 'chat.svg'),
        };
        this.tooltip = description;
        this.description = description;
    }
}
exports.ChatViewItem = ChatViewItem;
//# sourceMappingURL=chatViewProvider.js.map