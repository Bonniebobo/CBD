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
exports.openFileInEditor = exports.getActiveEditorPath = exports.getWorkspaceFilesWithContent = exports.getWorkspaceFiles = exports.isTextFile = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const TEXT_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.css', '.scss', '.html', '.xml', '.yaml', '.yml',
    '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
    '.vue', '.svelte', '.astro', '.config', '.env', '.gitignore', '.dockerfile', '.dockerignore',
];
function isTextFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return TEXT_EXTENSIONS.includes(ext) || !ext;
}
exports.isTextFile = isTextFile;
async function getWorkspaceFiles(limit = 100) {
    const files = [];
    if (!vscode.workspace.workspaceFolders) {
        return files;
    }
    for (const folder of vscode.workspace.workspaceFolders) {
        const pattern = new vscode.RelativePattern(folder, '**/*');
        const fileUris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        for (const uri of fileUris) {
            files.push(vscode.workspace.asRelativePath(uri));
            if (files.length >= limit) {
                return files;
            }
        }
    }
    return files.slice(0, limit);
}
exports.getWorkspaceFiles = getWorkspaceFiles;
async function getWorkspaceFilesWithContent(options = {}) {
    const limit = options.limit ?? 50;
    const maxFileSize = options.maxFileSize ?? 50000;
    const fileFilter = options.fileFilter ?? isTextFile;
    const files = [];
    if (!vscode.workspace.workspaceFolders) {
        return files;
    }
    for (const folder of vscode.workspace.workspaceFolders) {
        const pattern = new vscode.RelativePattern(folder, '**/*');
        const fileUris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        const limitedUris = fileUris.slice(0, limit);
        for (const uri of limitedUris) {
            const relativePath = vscode.workspace.asRelativePath(uri);
            if (!fileFilter(relativePath)) {
                continue;
            }
            try {
                const fileContent = await vscode.workspace.fs.readFile(uri);
                if (fileContent.length > maxFileSize) {
                    continue;
                }
                files.push({
                    filename: relativePath,
                    content: Buffer.from(fileContent).toString('utf8'),
                });
            }
            catch (error) {
                console.warn(`[AI Chatbot] Failed to read file ${uri.fsPath}:`, error);
            }
        }
    }
    return files;
}
exports.getWorkspaceFilesWithContent = getWorkspaceFilesWithContent;
function getActiveEditorPath() {
    const editor = vscode.window.activeTextEditor;
    return editor ? vscode.workspace.asRelativePath(editor.document.uri) : undefined;
}
exports.getActiveEditorPath = getActiveEditorPath;
async function openFileInEditor(fileName, lineNumber, column) {
    let document;
    const workspaceFiles = await getWorkspaceFiles();
    const matchingFile = workspaceFiles.find(file => file.endsWith(fileName) || file.includes(fileName));
    if (matchingFile) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, matchingFile);
            try {
                document = await vscode.workspace.openTextDocument(absolutePath);
            }
            catch {
                // Continue to fallback path
            }
        }
    }
    if (!document) {
        document = await vscode.workspace.openTextDocument(fileName);
    }
    const editor = await vscode.window.showTextDocument(document, column);
    if (lineNumber) {
        const position = new vscode.Position(lineNumber - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
    }
}
exports.openFileInEditor = openFileInEditor;
//# sourceMappingURL=fileHelpers.js.map