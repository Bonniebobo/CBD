export type ChatRole = 'user' | 'ai';

export interface ChatMessage {
    type: ChatRole;
    content: string;
}

export interface WorkspaceFile {
    filename: string;
    content: string;
}

export interface OpenFilePayload {
    fileName: string;
    lineNumber?: number;
}

export const MESSAGE_TYPES = {
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
    INITIAL_MESSAGE: 'initialMessage',
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

export interface WebviewToExtensionPayloadMap {
    [MESSAGE_TYPES.SEND_MESSAGE]: {text: string};
    [MESSAGE_TYPES.GET_WORKSPACE_FILES]: Record<string, never>;
    [MESSAGE_TYPES.GET_CURRENT_FILE]: Record<string, never>;
    [MESSAGE_TYPES.OPEN_FILE]: OpenFilePayload;
    [MESSAGE_TYPES.SAVE_CHAT_HISTORY]: {messages: ChatMessage[]};
    [MESSAGE_TYPES.REQUEST_CHAT_HISTORY]: Record<string, never>;
}

export interface ExtensionToWebviewPayloadMap {
    [MESSAGE_TYPES.AI_RESPONSE]: {response: string};
    [MESSAGE_TYPES.WORKSPACE_FILES]: {files: string[]};
    [MESSAGE_TYPES.CURRENT_FILE]: {file?: string};
    [MESSAGE_TYPES.LOAD_CHAT_HISTORY]: {messages: ChatMessage[]};
    [MESSAGE_TYPES.INITIAL_MESSAGE]: {message: string};
}

export type WebviewToExtensionMessage = {
    [K in keyof WebviewToExtensionPayloadMap]: {
        type: K;
        payload: WebviewToExtensionPayloadMap[K];
    }
}[keyof WebviewToExtensionPayloadMap];

export type ExtensionToWebviewMessage = {
    [K in keyof ExtensionToWebviewPayloadMap]: {
        type: K;
        payload: ExtensionToWebviewPayloadMap[K];
    }
}[keyof ExtensionToWebviewPayloadMap];

export function assertUnreachable(_value: never): never {
    throw new Error('Unhandled message type');
}
