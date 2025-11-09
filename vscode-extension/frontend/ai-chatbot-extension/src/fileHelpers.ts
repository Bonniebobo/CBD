import * as path from 'path';
import * as vscode from 'vscode';
import {WorkspaceFile} from './types';

const TEXT_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.css', '.scss', '.html', '.xml', '.yaml', '.yml',
    '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
    '.vue', '.svelte', '.astro', '.config', '.env', '.gitignore', '.dockerfile', '.dockerignore',
];

export interface WorkspaceContentOptions {
    limit?: number;
    maxFileSize?: number;
    fileFilter?: (filename: string) => boolean;
}

export function isTextFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return TEXT_EXTENSIONS.includes(ext) || !ext;
}

export async function getWorkspaceFiles(limit = 100): Promise<string[]> {
    const files: string[] = [];

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

export async function getWorkspaceFilesWithContent(options: WorkspaceContentOptions = {}): Promise<WorkspaceFile[]> {
    const limit = options.limit ?? 50;
    const maxFileSize = options.maxFileSize ?? 50000;
    const fileFilter = options.fileFilter ?? isTextFile;
    const files: WorkspaceFile[] = [];

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
            } catch (error) {
                console.warn(`[AI Chatbot] Failed to read file ${uri.fsPath}:`, error);
            }
        }
    }

    return files;
}

export function getActiveEditorPath(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    return editor ? vscode.workspace.asRelativePath(editor.document.uri) : undefined;
}

export async function openFileInEditor(
    fileName: string,
    lineNumber: number | undefined,
    column: vscode.ViewColumn,
): Promise<void> {
    let document: vscode.TextDocument | undefined;

    const workspaceFiles = await getWorkspaceFiles();
    const matchingFile = workspaceFiles.find(file =>
        file.endsWith(fileName) || file.includes(fileName),
    );

    if (matchingFile) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, matchingFile);
            try {
                document = await vscode.workspace.openTextDocument(absolutePath);
            } catch {
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
