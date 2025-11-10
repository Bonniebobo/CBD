/// <reference path="./types/proxyquire.d.ts" />
import { expect } from 'chai';
import { createRequire } from 'module';
import path from 'path';
import sinon from 'sinon';

declare const require: NodeRequire | undefined;
const fallbackSpecifier = path.join(process.cwd(), 'tests/fileHelper.spec.ts');
const localRequire = typeof require === 'undefined' ? createRequire(fallbackSpecifier) : require;
const proxyquireHelper = localRequire('proxyquire').noCallThru().noPreserveCache();

describe('fileHelpers', () => {
    let sandbox: sinon.SinonSandbox;
    let fileHelpers: typeof import('../src/fileHelpers');
    let vscodeStub: any;
    let lastShownEditor: {selection: any; revealRange: sinon.SinonStub} | undefined;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        lastShownEditor = undefined;

        class RelativePattern {
            base: unknown;
            pattern: string;

            constructor(base: unknown, pattern: string) {
                this.base = base;
                this.pattern = pattern;
            }
        }

        class Position {
            line: number;
            character: number;

            constructor(line: number, character: number) {
                this.line = line;
                this.character = character;
            }
        }

        class Selection {
            start: Position;
            end: Position;

            constructor(start: Position, end: Position) {
                this.start = start;
                this.end = end;
            }
        }

        class Range {
            start: Position;
            end: Position;

            constructor(start: Position, end: Position) {
                this.start = start;
                this.end = end;
            }
        }

        const showTextDocumentStub = sandbox.stub().callsFake(async () => {
            lastShownEditor = {
                selection: undefined,
                revealRange: sandbox.stub(),
            };
            return lastShownEditor;
        });

        const openTextDocumentStub = sandbox.stub().callsFake(async (resource: any) => ({
            uri: typeof resource === 'string' ? { fsPath: resource, path: resource } : resource,
        }));

        vscodeStub = {
            workspace: {
                workspaceFolders: undefined,
                findFiles: sandbox.stub().resolves([]),
                asRelativePath: sandbox.stub().callsFake((uri: {path?: string} | string) =>
                    typeof uri === 'string' ? uri : uri?.path ?? '',
                ),
                openTextDocument: openTextDocumentStub,
                fs: {
                    readFile: sandbox.stub().resolves(new Uint8Array()),
                },
            },
            window: {
                activeTextEditor: undefined,
                showTextDocument: showTextDocumentStub,
            },
            Uri: {
                joinPath: sandbox.stub().returns({ fsPath: '', path: '' }),
            },
            Position,
            Selection,
            Range,
            ViewColumn: {
                One: 1,
                Two: 2,
            },
            RelativePattern,
        };

        fileHelpers = proxyquireHelper('../src/fileHelpers', {
            vscode: vscodeStub,
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('isTextFile', () => {
        it('recognizes common text extensions', () => {
            const filenames = ['app.ts', 'styles.css', 'README.md'];

            for (const filename of filenames) {
                expect(fileHelpers.isTextFile(filename), `${filename} should be treated as text`).to.be.true;
            }
        });

        it('treats files without extensions as text', () => {
            const filenames = ['Dockerfile', 'LICENSE'];

            for (const filename of filenames) {
                expect(fileHelpers.isTextFile(filename), `${filename} should be treated as text`).to.be.true;
            }
        });

        it('rejects obvious binary extensions', () => {
            const filenames = ['logo.png', 'archive.zip'];

            for (const filename of filenames) {
                expect(fileHelpers.isTextFile(filename), `${filename} should be treated as binary`).to.be.false;
            }
        });
    });

    describe('getWorkspaceFilesWithContent', () => {
        it('returns empty list when no workspace folders', async () => {
            vscodeStub.workspace.workspaceFolders = undefined;

            const files = await fileHelpers.getWorkspaceFilesWithContent();

            expect(files).to.deep.equal([]);
            expect(vscodeStub.workspace.findFiles.called).to.be.false;
        });

        it('lists files with default limit and filter', async () => {
            const workspaceFolder = { uri: { fsPath: '/ws', path: '/ws' } };
            vscodeStub.workspace.workspaceFolders = [workspaceFolder];

            const fileUris = Array.from({ length: 4 }, (_, index) => ({
                fsPath: `/ws/src/file${index}.ts`,
                path: `/ws/src/file${index}.ts`,
            }));

            vscodeStub.workspace.findFiles.resolves(fileUris);
            vscodeStub.workspace.asRelativePath.callsFake((uri: {path: string}) => uri.path.replace('/ws/', ''));
            vscodeStub.workspace.fs.readFile.callsFake(async (uri: {fsPath: string}) =>
                Buffer.from(`content-${path.basename(uri.fsPath)}`),
            );

            const files = await fileHelpers.getWorkspaceFilesWithContent();

            expect(files).to.deep.equal(
                fileUris.map(uri => ({
                    filename: uri.path.replace('/ws/', ''),
                    content: `content-${path.basename(uri.fsPath)}`,
                })),
            );
            expect(vscodeStub.workspace.findFiles.calledOnce).to.be.true;
        });

        it('applies limit option', async () => {
            const workspaceFolder = { uri: { fsPath: '/ws', path: '/ws' } };
            vscodeStub.workspace.workspaceFolders = [workspaceFolder];

            const fileUris = Array.from({ length: 5 }, (_, index) => ({
                fsPath: `/ws/file${index}.ts`,
                path: `/ws/file${index}.ts`,
            }));

            vscodeStub.workspace.findFiles.resolves(fileUris);
            vscodeStub.workspace.asRelativePath.callsFake((uri: {path: string}) => uri.path.replace('/ws/', ''));
            const readFileStub = vscodeStub.workspace.fs.readFile.callsFake(async () => Buffer.from('content'));

            const files = await fileHelpers.getWorkspaceFilesWithContent({ limit: 3 });

            expect(files).to.have.lengthOf(3);
            expect(files.map(file => file.filename)).to.deep.equal([
                'file0.ts', 'file1.ts', 'file2.ts',
            ]);
            expect(readFileStub.callCount).to.equal(3);
        });

        it('applies provided fileFilter predicate', async () => {
            const workspaceFolder = { uri: { fsPath: '/ws', path: '/ws' } };
            vscodeStub.workspace.workspaceFolders = [workspaceFolder];

            const fileUris = [
                { fsPath: '/ws/src/app.ts', path: '/ws/src/app.ts' },
                { fsPath: '/ws/src/styles.css', path: '/ws/src/styles.css' },
                { fsPath: '/ws/src/utils.ts', path: '/ws/src/utils.ts' },
            ];

            vscodeStub.workspace.findFiles.resolves(fileUris);
            vscodeStub.workspace.asRelativePath.callsFake((uri: {path: string}) => uri.path.replace('/ws/', ''));
            const readFileStub = vscodeStub.workspace.fs.readFile.callsFake(async () => Buffer.from('filtered'));
            const fileFilter = sandbox.spy((filename: string) => filename.endsWith('.ts'));

            const files = await fileHelpers.getWorkspaceFilesWithContent({ fileFilter });

            expect(fileFilter.callCount).to.equal(fileUris.length);
            expect(files).to.deep.equal([
                { filename: 'src/app.ts', content: 'filtered' },
                { filename: 'src/utils.ts', content: 'filtered' },
            ]);
            expect(readFileStub.callCount).to.equal(2);
        });

        it('reads UTF-8 content for each accepted file', async () => {
            const workspaceFolder = { uri: { fsPath: '/ws', path: '/ws' } };
            vscodeStub.workspace.workspaceFolders = [workspaceFolder];

            const fileUris = [
                { fsPath: '/ws/src/a.ts', path: '/ws/src/a.ts' },
                { fsPath: '/ws/src/b.ts', path: '/ws/src/b.ts' },
            ];

            vscodeStub.workspace.findFiles.resolves(fileUris);
            vscodeStub.workspace.asRelativePath.callsFake((uri: {path: string}) => uri.path.replace('/ws/', ''));
            vscodeStub.workspace.fs.readFile.callsFake(async (uri: {fsPath: string}) =>
                new Uint8Array(Buffer.from(`content-${path.basename(uri.fsPath)}`)),
            );

            const files = await fileHelpers.getWorkspaceFilesWithContent();

            expect(files).to.deep.equal([
                { filename: 'src/a.ts', content: 'content-a.ts' },
                { filename: 'src/b.ts', content: 'content-b.ts' },
            ]);
        });

        it('skips files rejected by fileFilter', async () => {
            const workspaceFolder = { uri: { fsPath: '/ws', path: '/ws' } };
            vscodeStub.workspace.workspaceFolders = [workspaceFolder];
            const fileUris = [
                { fsPath: '/ws/src/app.ts', path: '/ws/src/app.ts' },
                { fsPath: '/ws/assets/image.png', path: '/ws/assets/image.png' },
            ];

            const fileFilter = sandbox.stub().callsFake((filename: string) => !filename.endsWith('.png'));

            vscodeStub.workspace.findFiles.resolves(fileUris);
            vscodeStub.workspace.asRelativePath.callsFake((uri: {path: string}) => uri.path.replace('/ws/', ''));
            vscodeStub.workspace.fs.readFile.callsFake(async () => new Uint8Array(Buffer.from('ok')));

            const files = await fileHelpers.getWorkspaceFilesWithContent({ fileFilter });

            expect(fileFilter.calledWith('assets/image.png')).to.be.true;
            expect(files).to.deep.equal([{ filename: 'src/app.ts', content: 'ok' }]);
        });

        it('honors maxFileSize option', async () => {
            const workspaceFolder = { uri: { fsPath: '/ws', path: '/ws' } };
            vscodeStub.workspace.workspaceFolders = [workspaceFolder];
            const fileUris = [{ fsPath: '/ws/src/large.ts', path: '/ws/src/large.ts' }];

            vscodeStub.workspace.findFiles.resolves(fileUris);
            vscodeStub.workspace.asRelativePath.callsFake((uri: {path: string}) => uri.path.replace('/ws/', ''));
            vscodeStub.workspace.fs.readFile.callsFake(async () => new Uint8Array(2048));

            const files = await fileHelpers.getWorkspaceFilesWithContent({ maxFileSize: 1024 });

            expect(files).to.deep.equal([]);
        });

        it('omits files whose read fails', async () => {
            const workspaceFolder = { uri: { fsPath: '/ws', path: '/ws' } };
            vscodeStub.workspace.workspaceFolders = [workspaceFolder];
            const fileUris = [
                { fsPath: '/ws/src/good.ts', path: '/ws/src/good.ts' },
                { fsPath: '/ws/src/bad.ts', path: '/ws/src/bad.ts' },
            ];

            vscodeStub.workspace.findFiles.resolves(fileUris);
            vscodeStub.workspace.asRelativePath.callsFake((uri: {path: string}) => uri.path.replace('/ws/', ''));
            vscodeStub.workspace.fs.readFile.callsFake(async (uri: {fsPath: string}) => {
                if (uri.fsPath.endsWith('bad.ts')) {
                    throw new Error('boom');
                }
                return new Uint8Array(Buffer.from('good'));
            });

            const files = await fileHelpers.getWorkspaceFilesWithContent();

            expect(files).to.deep.equal([{ filename: 'src/good.ts', content: 'good' }]);
        });
    });

    describe('getActiveEditorPath', () => {
        it('returns relative path of active editor', () => {
            const editorUri = { fsPath: '/x/y.ts', path: '/x/y.ts' };
            vscodeStub.window.activeTextEditor = {
                document: { uri: editorUri },
            };
            vscodeStub.workspace.asRelativePath.withArgs(editorUri).returns('src/y.ts');

            const pathResult = fileHelpers.getActiveEditorPath();

            expect(pathResult).to.equal('src/y.ts');
        });

        it('returns undefined when no active editor exists', () => {
            vscodeStub.window.activeTextEditor = undefined;

            const pathResult = fileHelpers.getActiveEditorPath();

            expect(pathResult).to.be.undefined;
        });
    });

    describe('openFileInEditor', () => {
        it('opens a document and shows it when no workspace match exists', async () => {
            vscodeStub.workspace.workspaceFolders = undefined;

            await fileHelpers.openFileInEditor('/tmp/file.ts', undefined, vscodeStub.ViewColumn.One);

            expect(vscodeStub.workspace.openTextDocument.calledOnceWithExactly('/tmp/file.ts')).to.be.true;
            expect(vscodeStub.window.showTextDocument.calledOnce).to.be.true;
            expect(lastShownEditor).to.exist;
            expect(lastShownEditor?.selection).to.be.undefined;
            expect(lastShownEditor?.revealRange.called).to.be.false;
        });

        it('selects and reveals the requested line number', async () => {
            vscodeStub.workspace.workspaceFolders = undefined;

            await fileHelpers.openFileInEditor('/tmp/file.ts', 42, vscodeStub.ViewColumn.One);

            expect(lastShownEditor).to.exist;
            const selection = lastShownEditor?.selection as {start: {line: number}};
            expect(selection.start.line).to.equal(41);
            expect(lastShownEditor?.revealRange.calledOnce).to.be.true;
            const rangeArg = lastShownEditor?.revealRange.getCall(0).args[0] as {start: {line: number}};
            expect(rangeArg.start.line).to.equal(41);
        });
    });
});
