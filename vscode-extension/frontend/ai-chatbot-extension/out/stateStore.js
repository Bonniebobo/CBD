"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatStateStore = exports.ChatStateStore = void 0;
const config_1 = require("./config");
class ChatStateStore {
    constructor(storage, key = config_1.CONFIG.CHAT_HISTORY_KEY) {
        this.storage = storage;
        this.key = key;
    }
    getChatHistory() {
        return this.storage.get(this.key, []);
    }
    async saveChatHistory(messages) {
        await this.storage.update(this.key, messages);
    }
    async clearChatHistory() {
        await this.storage.update(this.key, []);
    }
}
exports.ChatStateStore = ChatStateStore;
function createChatStateStore(context) {
    return new ChatStateStore(context.globalState);
}
exports.createChatStateStore = createChatStateStore;
//# sourceMappingURL=stateStore.js.map