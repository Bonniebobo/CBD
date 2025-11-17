"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUnreachable = exports.MESSAGE_TYPES = void 0;
exports.MESSAGE_TYPES = {
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
};
function assertUnreachable(_value) {
    throw new Error('Unhandled message type');
}
exports.assertUnreachable = assertUnreachable;
//# sourceMappingURL=types.js.map