import * as vscode from 'vscode';
import { ChatWebviewProvider } from './chatWebviewProvider';

export class ChatViewProvider implements vscode.TreeDataProvider<ChatViewItem>, vscode.Disposable {
    private _onDidChangeTreeData: vscode.EventEmitter<ChatViewItem | undefined | null | void> = new vscode.EventEmitter<ChatViewItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ChatViewItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private extensionUri: vscode.Uri) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ChatViewItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ChatViewItem): Thenable<ChatViewItem[]> {
        if (!element) {
            return Promise.resolve([
                new ChatViewItem(
                    'Open AI Chat',
                    'Start a new conversation with the AI assistant',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'ai-chatbot.openChat',
                        title: 'Open AI Chat',
                        arguments: []
                    }
                ),
                new ChatViewItem(
                    'Repository Analysis',
                    'Analyze your current repository structure',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'ai-chatbot.openChat',
                        title: 'Repository Analysis',
                        arguments: ['analyze repository']
                    }
                ),
                new ChatViewItem(
                    'Code Generation',
                    'Generate code based on your requirements',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'ai-chatbot.openChat',
                        title: 'Code Generation',
                        arguments: ['generate code']
                    }
                )
            ]);
        }
        return Promise.resolve([]);
    }

    dispose() {
        this._onDidChangeTreeData.dispose();
    }
}

export class ChatViewItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = description;
        this.description = description;
    }

    iconPath = {
        light: vscode.Uri.joinPath(vscode.Uri.file(__dirname), '..', '..', 'resources', 'light', 'chat.svg'),
        dark: vscode.Uri.joinPath(vscode.Uri.file(__dirname), '..', '..', 'resources', 'dark', 'chat.svg')
    };
}
