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
exports.callBackendAPI = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url_1 = require("url");
async function callBackendAPI(prompt, files, backendUrl) {
    const endpoint = new url_1.URL('/upload', backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`);
    const client = endpoint.protocol === 'https:' ? https : http;
    const postData = JSON.stringify({ files, prompt });
    return new Promise((resolve, reject) => {
        const options = {
            hostname: endpoint.hostname,
            port: endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80),
            path: endpoint.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };
        const req = client.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`Backend API error: ${res.statusCode ?? 'unknown'} ${res.statusMessage ?? ''}`.trim()));
                    return;
                }
                try {
                    const payload = JSON.parse(rawData);
                    if (payload.error) {
                        reject(new Error(payload.error));
                        return;
                    }
                    const aiResponse = typeof payload.aiResponse === 'string' ? payload.aiResponse : payload.message;
                    if (typeof aiResponse === 'string' && aiResponse.trim().length > 0) {
                        resolve(aiResponse);
                        return;
                    }
                    reject(new Error('Backend response received but no AI content was provided.'));
                }
                catch (error) {
                    reject(new Error(`Invalid response from backend: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        req.write(postData);
        req.end();
    });
}
exports.callBackendAPI = callBackendAPI;
//# sourceMappingURL=backendClient.js.map