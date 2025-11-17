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
exports.getLocalResourceRoots = exports.CONFIG = void 0;
const vscode = __importStar(require("vscode"));
exports.CONFIG = {
    VIEW_TYPE: 'ai-chatbot.webview',
    PANEL_TITLE: 'AI Chatbot Assistant',
    CHAT_HISTORY_KEY: 'ai-chatbot.chatHistory',
    VIEW_COLUMN: vscode.ViewColumn.Two,
    FILE_OPEN_COLUMN: vscode.ViewColumn.One,
    LOAD_DELAY_MS: 100,
    SAVE_DELAY_MS: 100,
    WEBVIEW_REQUEST_DELAY_MS: 200,
    BACKEND_URL_SETTING: 'ai-chatbot.backendUrl',
    DEFAULT_BACKEND_URL: 'https://4xwuxxqbqj.execute-api.us-east-1.amazonaws.com/', //'http://localhost:3001',
};
function getLocalResourceRoots(extensionUri) {
    return [
        vscode.Uri.joinPath(extensionUri, 'out'),
        vscode.Uri.joinPath(extensionUri, 'resources'),
    ];
}
exports.getLocalResourceRoots = getLocalResourceRoots;
//# sourceMappingURL=config.js.map