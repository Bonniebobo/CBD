import * as vscode from 'vscode';
import {CONFIG} from './config';
import {ChatMessage} from './types';

export class ChatStateStore {
    constructor(
        private readonly storage: vscode.Memento,
        private readonly key: string = CONFIG.CHAT_HISTORY_KEY,
    ) {}

    public getChatHistory(): ChatMessage[] {
        return this.storage.get<ChatMessage[]>(this.key, []);
    }

    public async saveChatHistory(messages: ChatMessage[]): Promise<void> {
        await this.storage.update(this.key, messages);
    }

    public async clearChatHistory(): Promise<void> {
        await this.storage.update(this.key, []);
    }
}

export function createChatStateStore(context: vscode.ExtensionContext): ChatStateStore {
    return new ChatStateStore(context.globalState);
}
