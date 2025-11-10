import { expect } from 'chai';
import sinon from 'sinon';
import * as types from '../src/types';

const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const { MESSAGE_TYPES } = types;

interface TestHarness {
    ChatWebviewProvider: typeof import('../src/chatWebviewProvider').ChatWebviewProvider;
    extensionContext: {globalState: Record<string, unknown>};
    extensionUri: {fsPath: string; path: string; toString(): string};
    vscodeStub: any;
    panelStub: any;
    localResourceRoots: unknown[];
    fsStub: {
        existsSync: sinon.SinonStub;
        readFileSync: sinon.SinonStub;
    };
    fileHelpersStub: {
        getActiveEditorPath: sinon.SinonStub;
        getWorkspaceFiles: sinon.SinonStub;
        getWorkspaceFilesWithContent: sinon.SinonStub;
        isTextFile: sinon.SinonStub;
        openFileInEditor: sinon.SinonStub;
    };
    backendClientStub: {
        callBackendAPI: sinon.SinonStub;
    };
    typesStub: typeof types & {assertUnreachable: sinon.SinonStub<[never], never>};
    stateStoreStub: {
        clearChatHistory: sinon.SinonStub;
        getChatHistory: sinon.SinonStub;
        saveChatHistory: sinon.SinonStub;
    };
}

describe('ChatWebviewProvider', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    function createUri(path: string) {
        return {
            fsPath: path,
            path,
            toString: () => path,
        };
    }

    function setupHarness(): TestHarness {
        const postMessageStub = sandbox.stub().resolves(undefined);
        let webviewHtml = '';
        const webviewStub = {
            get html() {
                return webviewHtml;
            },
            set html(value: string) {
                webviewHtml = value;
            },
            asWebviewUri: sandbox.stub().callsFake((uri: {fsPath: string}) => ({
                fsPath: `webview:${uri.fsPath}`,
                path: `webview:${uri.fsPath}`,
                toString: () => `webview:${uri.fsPath}`,
            })),
            postMessage: postMessageStub,
            onDidReceiveMessage: sandbox.stub(),
        };

        const panelStub = {
            webview: webviewStub,
            onDidDispose: sandbox.stub(),
            onDidChangeViewState: sandbox.stub(),
            reveal: sandbox.stub(),
        };

        const localResourceRoots = [createUri('/extension/resources')];
        const getLocalResourceRootsStub = sandbox.stub().returns(localResourceRoots);

        const createWebviewPanelStub = sandbox.stub().returns(panelStub);
        const vscodeStub = {
            window: {
                createWebviewPanel: createWebviewPanelStub,
                showWarningMessage: sandbox.stub(),
                activeTextEditor: undefined,
            },
            workspace: {
                getConfiguration: sandbox.stub().returns({
                    get: sandbox.stub().returns('http://localhost:3001'),
                }),
            },
            Uri: {
                joinPath: sandbox.stub().callsFake((base: {fsPath?: string}, ...segments: string[]) => {
                    const fullPath = [base.fsPath ?? '', ...segments].join('/');
                    return createUri(fullPath);
                }),
            },
            ViewColumn: {
                One: 1,
                Two: 2,
            },
        };

        const fsStub = {
            existsSync: sandbox.stub().returns(false),
            readFileSync: sandbox.stub(),
        };

        const stateStoreStub = {
            getChatHistory: sandbox.stub().returns([]),
            saveChatHistory: sandbox.stub().resolves(undefined),
            clearChatHistory: sandbox.stub().resolves(undefined),
        };

        const createChatStateStoreStub = sandbox.stub().returns(stateStoreStub);

        const fileHelpersStub = {
            getActiveEditorPath: sandbox.stub().returns(undefined),
            getWorkspaceFiles: sandbox.stub().resolves([]),
            getWorkspaceFilesWithContent: sandbox.stub().resolves([]),
            isTextFile: sandbox.stub().returns(true),
            openFileInEditor: sandbox.stub().resolves(undefined),
        };

        const configStub = {
            CONFIG: {
                VIEW_TYPE: 'test.view',
                PANEL_TITLE: 'Test Panel',
                CHAT_HISTORY_KEY: 'test.history',
                VIEW_COLUMN: 2,
                FILE_OPEN_COLUMN: 1,
                LOAD_DELAY_MS: 0,
                SAVE_DELAY_MS: 0,
                WEBVIEW_REQUEST_DELAY_MS: 0,
                BACKEND_URL_SETTING: 'ai-chatbot.backendUrl',
                DEFAULT_BACKEND_URL: 'http://localhost:3001',
            },
            getLocalResourceRoots: getLocalResourceRootsStub,
        };

        const assertUnreachableStub = sandbox.stub() as sinon.SinonStub<[never], never>;
        assertUnreachableStub.callsFake(() => undefined as never);
        const typesStub = {
            ...types,
            assertUnreachable: assertUnreachableStub,
        };

        const backendClientStub = {
            callBackendAPI: sandbox.stub().resolves('ok'),
        };

        const { ChatWebviewProvider } = proxyquire('../src/chatWebviewProvider', {
            vscode: vscodeStub,
            fs: fsStub,
            './config': configStub,
            './stateStore': {
                createChatStateStore: createChatStateStoreStub,
                ChatStateStore: class {},
            },
            './backendClient': backendClientStub,
            './fileHelpers': fileHelpersStub,
            './types': typesStub,
        });

        const extensionUri = createUri('/extension');
        const extensionContext = { globalState: {} };

        return {
            ChatWebviewProvider,
            extensionContext,
            extensionUri,
            vscodeStub,
            panelStub,
            localResourceRoots,
            fsStub,
            fileHelpersStub,
            typesStub,
            stateStoreStub,
            backendClientStub,
        };
    }

    it('createOrShow creates a panel and posts an initial message when no panel exists', () => {
        const harness = setupHarness();
        const setupWebviewSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupWebview');
        const setupMessageHandlersSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupMessageHandlers');
        const setupPanelEventHandlersSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupPanelEventHandlers');

        const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);

        provider.createOrShow('hi');

        expect(harness.vscodeStub.window.createWebviewPanel.calledOnce).to.be.true;
        const [viewType, title, column, options] = harness.vscodeStub.window.createWebviewPanel.getCall(0).args;
        expect(viewType).to.equal('test.view');
        expect(title).to.equal('Test Panel');
        expect(column).to.equal(2);
        expect(options.enableScripts).to.be.true;
        expect(options.retainContextWhenHidden).to.be.true;
        expect(options.localResourceRoots).to.equal(harness.localResourceRoots);

        expect(harness.stateStoreStub.clearChatHistory.calledOnce).to.be.true;
        expect(setupWebviewSpy.calledOnceWithExactly(harness.panelStub)).to.be.true;
        expect(setupMessageHandlersSpy.calledOnceWithExactly(harness.panelStub)).to.be.true;
        expect(setupPanelEventHandlersSpy.calledOnceWithExactly(harness.panelStub)).to.be.true;

        const postedMessages = harness.panelStub.webview.postMessage.getCalls().map((call: sinon.SinonSpyCall<any[], any>) => call.args[0]);
        expect(postedMessages).to.deep.include({
            type: MESSAGE_TYPES.INITIAL_MESSAGE,
            payload: { message: 'hi' },
        });
    });

    it('createOrShow reveals existing panel instead of creating a new one', () => {
        const harness = setupHarness();
        const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
        (provider as any)._panel = harness.panelStub;

        provider.createOrShow('again');

        expect(harness.panelStub.reveal.calledOnceWithExactly(2)).to.be.true;
        expect(harness.vscodeStub.window.createWebviewPanel.called).to.be.false;
        const postedMessages = harness.panelStub.webview.postMessage.getCalls().map((call: sinon.SinonSpyCall<any[], any>) => call.args[0]);
        expect(postedMessages).to.deep.include({
            type: MESSAGE_TYPES.INITIAL_MESSAGE,
            payload: { message: 'again' },
        });
    });

    it('restore reuses provided panel and reinitializes handlers', () => {
        const harness = setupHarness();
        const setupWebviewSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupWebview');
        const setupMessageHandlersSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupMessageHandlers');
        const loadChatHistorySpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_loadChatHistoryWithDelay');

        const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
        const panel = harness.panelStub;

        provider.restore(panel, {});

        expect((provider as any)._panel).to.equal(panel);
        expect(setupWebviewSpy.calledOnceWithExactly(panel)).to.be.true;
        expect(setupMessageHandlersSpy.calledOnceWithExactly(panel)).to.be.true;
        expect(loadChatHistorySpy.calledOnce).to.be.true;
    });

    describe('_tryRevealExistingPanel', () => {
        it('reveals existing panel and posts initial message', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            (provider as any)._panel = harness.panelStub;

            const result = (provider as any)._tryRevealExistingPanel('hello');

            expect(result).to.be.true;
            expect(harness.panelStub.reveal.calledOnceWithExactly(2)).to.be.true;
            const postedMessages = harness.panelStub.webview.postMessage.getCalls().map((call: sinon.SinonSpyCall<any[], any>) => call.args[0]);
            expect(postedMessages).to.deep.include({
                type: MESSAGE_TYPES.INITIAL_MESSAGE,
                payload: { message: 'hello' },
            });
        });

        it('returns false when no panel is present', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);

            const result = (provider as any)._tryRevealExistingPanel();

            expect(result).to.be.false;
            expect(harness.panelStub.reveal.called).to.be.false;
        });

        it('clears disposed panel and returns false when reveal throws', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const sendMessageSpy = sandbox.spy(provider as any, '_sendMessageToWebview');

            (provider as any)._panel = {
                reveal: sandbox.stub().throws(new Error('boom')),
                webview: harness.panelStub.webview,
            };

            const result = (provider as any)._tryRevealExistingPanel('hello');

            expect(result).to.be.false;
            expect((provider as any)._panel).to.be.undefined;
            expect(sendMessageSpy.called).to.be.false;
        });
    });

    describe('_createNewPanel', () => {
        it('creates a new panel with expected options and local resource roots', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const setupWebviewSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupWebview');
            const setupMessageHandlersSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupMessageHandlers');
            const setupPanelEventHandlersSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_setupPanelEventHandlers');
            harness.stateStoreStub.clearChatHistory.resetHistory();
            (provider as any)._createNewPanel('new message');

            expect(harness.stateStoreStub.clearChatHistory.calledOnce).to.be.true;
            expect(harness.vscodeStub.window.createWebviewPanel.calledOnce).to.be.true;
            const args = harness.vscodeStub.window.createWebviewPanel.getCall(0).args;
            const options = args[3];
            expect(options.enableScripts).to.be.true;
            expect(options.retainContextWhenHidden).to.be.true;
            expect(options.localResourceRoots).to.equal(harness.localResourceRoots);
            expect(setupWebviewSpy.calledOnce).to.be.true;
            expect(setupMessageHandlersSpy.calledOnce).to.be.true;
            expect(setupPanelEventHandlersSpy.calledOnce).to.be.true;
            const postedMessages = harness.panelStub.webview.postMessage.getCalls().map((call: sinon.SinonSpyCall<any[], any>) => call.args[0]);
            expect(postedMessages).to.deep.include({
                type: MESSAGE_TYPES.INITIAL_MESSAGE,
                payload: { message: 'new message' },
            });
        });
    });

    describe('_setupWebview', () => {
        it('loads React HTML and rewrites asset URIs', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            harness.fsStub.existsSync.returns(true);
            harness.fsStub.readFileSync.returns(`
                <html>
                    <head>
                        <link rel="stylesheet" href="style.css" />
                    </head>
                    <body>
                        <div id="root"></div>
                        <script src="main.js"></script>
                    </body>
                </html>
            `);

            (provider as any)._setupWebview(harness.panelStub);

            const html = harness.panelStub.webview.html;
            expect(html).to.contain('href="webview:/extension/out/style.css"');
            expect(html).to.contain('src="webview:/extension/out/main.js"');
            expect(html).to.contain('src="webview:/extension/resources/webviewClient.js"');
        });

        it('falls back to default HTML when React bundle is missing', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            harness.fsStub.existsSync.returns(false);

            const fallbackSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_getFallbackHtml');
            (provider as any)._setupWebview(harness.panelStub);

            expect(fallbackSpy.calledOnce).to.be.true;
            const html = harness.panelStub.webview.html;
            expect(html).to.contain('<title>AI Chatbot Assistant</title>');
            expect(html).to.contain('webviewClient.js');
        });

        it('uses fallback HTML when bundle read fails', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            harness.fsStub.existsSync.returns(true);
            harness.fsStub.readFileSync.throws(new Error('read fail'));
            const fallbackSpy = sandbox.spy(harness.ChatWebviewProvider.prototype as any, '_getFallbackHtml');

            (provider as any)._setupWebview(harness.panelStub);

            expect(fallbackSpy.calledOnce).to.be.true;
            const html = harness.panelStub.webview.html;
            expect(html).to.contain('<title>AI Chatbot Assistant</title>');
        });
    });

    describe('_setupMessageHandlers', () => {
        it('registers onDidReceiveMessage exactly once with handler', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const handlerStub = harness.panelStub.webview.onDidReceiveMessage;

            (provider as any)._setupMessageHandlers(harness.panelStub);

            expect(handlerStub.calledOnce).to.be.true;
            const args = handlerStub.getCall(0).args;
            expect(args[0]).to.be.a('function');
            expect(() => args[0]({ type: MESSAGE_TYPES.GET_CURRENT_FILE, payload: {} })).to.not.throw();
        });
    });

    describe('_setupPanelEventHandlers', () => {
        it('disposes panel and reloads chat history when visible', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            (provider as any)._panel = harness.panelStub;
            const loadChatHistorySpy = sandbox.spy(provider as any, '_loadChatHistory');

            (provider as any)._setupPanelEventHandlers(harness.panelStub);

            // Verify disposal handler
            expect(harness.panelStub.onDidDispose.calledOnce).to.be.true;
            const disposeHandler = harness.panelStub.onDidDispose.getCall(0).args[0];
            expect(disposeHandler).to.be.a('function');
            disposeHandler();
            expect((provider as any)._panel).to.be.undefined;

            // Verify view state handler
            expect(harness.panelStub.onDidChangeViewState.calledOnce).to.be.true;
            const viewStateHandler = harness.panelStub.onDidChangeViewState.getCall(0).args[0];
            expect(viewStateHandler).to.be.a('function');
            viewStateHandler({ webviewPanel: { visible: true, active: true } });
            expect(loadChatHistorySpy.calledOnce).to.be.true;

            // Should not reload when not visible/active
            viewStateHandler({ webviewPanel: { visible: false, active: true } });
            expect(loadChatHistorySpy.calledOnce).to.be.true;
        });
    });

    describe('_handleWebviewMessage', () => {
        it('routes user prompt messages to _handleUserMessage', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const handleUserMessageStub = sandbox.stub(provider as any, '_handleUserMessage').resolves();

            await (provider as any)._handleWebviewMessage({
                type: MESSAGE_TYPES.SEND_MESSAGE,
                payload: { text: 'Hello' },
            });

            expect(handleUserMessageStub.calledOnceWithExactly('Hello')).to.be.true;
        });

        it('ignores unknown message types without side effects', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const sendWorkspaceFilesSpy = sandbox.spy(provider as any, '_sendWorkspaceFiles');
            const sendCurrentFileSpy = sandbox.spy(provider as any, '_sendCurrentFile');
            const openFileSpy = sandbox.spy(provider as any, '_openFile');
            const saveChatHistorySpy = sandbox.spy(provider as any, '_saveChatHistory');

            const unknownMessage = { type: 'unknown' as any, payload: {} };

            await (provider as any)._handleWebviewMessage(unknownMessage);

            expect(sendWorkspaceFilesSpy.called).to.be.false;
            expect(sendCurrentFileSpy.called).to.be.false;
            expect(openFileSpy.called).to.be.false;
            expect(saveChatHistorySpy.called).to.be.false;
            expect(harness.typesStub.assertUnreachable.calledOnce).to.be.true;
            expect(harness.typesStub.assertUnreachable.getCall(0).args[0]).to.equal(unknownMessage);
            expect(harness.panelStub.webview.postMessage.called).to.be.false;
        });

        it('routes GET_WORKSPACE_FILES to _sendWorkspaceFiles', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            (provider as any)._panel = harness.panelStub;
            const spy = sandbox.stub(provider as any, '_sendWorkspaceFiles');

            await (provider as any)._handleWebviewMessage({
                type: MESSAGE_TYPES.GET_WORKSPACE_FILES,
                payload: {},
            });

            expect(spy.calledOnce).to.be.true;
        });

        it('routes GET_CURRENT_FILE to _sendCurrentFile', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const spy = sandbox.stub(provider as any, '_sendCurrentFile');

            await (provider as any)._handleWebviewMessage({
                type: MESSAGE_TYPES.GET_CURRENT_FILE,
                payload: {},
            });

            expect(spy.calledOnce).to.be.true;
        });

        it('routes OPEN_FILE to _openFile with payload parameters', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const spy = sandbox.stub(provider as any, '_openFile').resolves();
            const payload = { fileName: '/x/a.ts', lineNumber: 12 };

            await (provider as any)._handleWebviewMessage({
                type: MESSAGE_TYPES.OPEN_FILE,
                payload,
            });

            expect(spy.calledOnceWithExactly(payload.fileName, payload.lineNumber)).to.be.true;
        });

        it('routes SAVE_CHAT_HISTORY to _saveChatHistory', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const spy = sandbox.stub(provider as any, '_saveChatHistory');
            const payload = { messages: [{ text: 'hi' }] } as any;

            await (provider as any)._handleWebviewMessage({
                type: MESSAGE_TYPES.SAVE_CHAT_HISTORY,
                payload,
            });

            expect(spy.calledOnceWithExactly(payload.messages)).to.be.true;
        });

        it('routes REQUEST_CHAT_HISTORY to _loadChatHistory', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const spy = sandbox.stub(provider as any, '_loadChatHistory');

            await (provider as any)._handleWebviewMessage({
                type: MESSAGE_TYPES.REQUEST_CHAT_HISTORY,
                payload: {},
            });

            expect(spy.calledOnce).to.be.true;
        });
    });

    describe('_handleUserMessage', () => {
        it('processes user message end to end and posts backend result', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            (provider as any)._panel = harness.panelStub;
            const workspaceFiles = [{ filename: 'file.ts', content: 'code' }];
            const backendResult = 'final response';
            const getWorkspaceFilesWithContentStub = sandbox.stub(provider as any, '_getWorkspaceFilesWithContent').resolves(workspaceFiles);
            const callBackendAPIStub = sandbox.stub(provider as any, '_callBackendAPI').resolves(backendResult);

            await (provider as any)._handleUserMessage('Hi');

            expect(getWorkspaceFilesWithContentStub.calledOnce).to.be.true;
            expect(callBackendAPIStub.calledOnceWithExactly('Hi', workspaceFiles)).to.be.true;

            const postedMessages = harness.panelStub.webview.postMessage.getCalls().map((call: sinon.SinonSpyCall<any[], any>) => call.args[0]);
            expect(postedMessages[0]).to.deep.equal({
                type: MESSAGE_TYPES.AI_RESPONSE,
                payload: { response: '🤖 Analyzing your codebase... Please wait.' },
            });
            expect(postedMessages[1]).to.deep.equal({
                type: MESSAGE_TYPES.AI_RESPONSE,
                payload: { response: backendResult },
            });
        });

        it('surfaces backend errors to the UI without throwing', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            (provider as any)._panel = harness.panelStub;
            sandbox.stub(provider as any, '_getWorkspaceFilesWithContent').resolves([]);
            sandbox.stub(provider as any, '_callBackendAPI').rejects(new Error('boom'));

            await (provider as any)._handleUserMessage('Hey');

            const postedMessages = harness.panelStub.webview.postMessage.getCalls().map((call: sinon.SinonSpyCall<any[], any>) => call.args[0]);
            expect(postedMessages[0]).to.deep.equal({
                type: MESSAGE_TYPES.AI_RESPONSE,
                payload: { response: '🤖 Analyzing your codebase... Please wait.' },
            });
            expect(postedMessages[1].type).to.equal(MESSAGE_TYPES.AI_RESPONSE);
            expect(postedMessages[1].payload.response).to.contain('Failed to contact the Gemini backend');
        });

        it('exits early when no panel available', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const getWorkspaceFilesWithContentStub = sandbox.stub(provider as any, '_getWorkspaceFilesWithContent');
            const callBackendAPIStub = sandbox.stub(provider as any, '_callBackendAPI');

            await (provider as any)._handleUserMessage('Hello');

            expect(getWorkspaceFilesWithContentStub.called).to.be.false;
            expect(callBackendAPIStub.called).to.be.false;
            expect(harness.panelStub.webview.postMessage.called).to.be.false;
        });
    });

    describe('_openFile', () => {
        it('opens a file at the requested line number', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);

            await (provider as any)._openFile('/a/b.ts', 10);

            expect(harness.fileHelpersStub.openFileInEditor.calledOnceWithExactly('/a/b.ts', 10, 1)).to.be.true;
            expect(harness.vscodeStub.window.showWarningMessage.called).to.be.false;
        });

        it('opens a file at the top when no line number provided', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);

            await (provider as any)._openFile('/a/b.ts');

            expect(harness.fileHelpersStub.openFileInEditor.calledOnceWithExactly('/a/b.ts', undefined, 1)).to.be.true;
        });

        it('shows warning and logs when editor open fails', async () => {
            const harness = setupHarness();
            harness.fileHelpersStub.openFileInEditor.rejects(new Error('EOPEN'));
            const warnSpy = sandbox.spy(console, 'warn');
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);

            await (provider as any)._openFile('/x/fail.ts', 3);

            expect(harness.vscodeStub.window.showWarningMessage.calledOnce).to.be.true;
            expect(harness.vscodeStub.window.showWarningMessage.getCall(0).args[0]).to.contain('/x/fail.ts');
            expect(warnSpy.calledOnce).to.be.true;
        });
    });

    describe('workspace helpers', () => {
        it('_getWorkspaceFiles returns filenames from helper', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const files = ['a.ts', 'b.ts'];
            harness.fileHelpersStub.getWorkspaceFiles.resolves(files);

            const result = await (provider as any)._getWorkspaceFiles();

            expect(harness.fileHelpersStub.getWorkspaceFiles.calledOnce).to.be.true;
            expect(result).to.equal(files);
        });

        it('_getWorkspaceFilesWithContent applies text filter predicate', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const detailedFiles = [{ filename: 'main.ts', content: 'code' }];
            harness.fileHelpersStub.getWorkspaceFilesWithContent.callsFake(async ({ fileFilter }) => {
                expect(fileFilter('main.ts')).to.be.true;
                expect(fileFilter('binary.bin')).to.be.false;
                return detailedFiles;
            });
            harness.fileHelpersStub.isTextFile.callsFake((filename: string) => filename.endsWith('.ts'));

            const result = await (provider as any)._getWorkspaceFilesWithContent();

            expect(result).to.equal(detailedFiles);
            expect(harness.fileHelpersStub.getWorkspaceFilesWithContent.calledOnce).to.be.true;
        });

        it('_isTextFile delegates to helper', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            harness.fileHelpersStub.isTextFile.withArgs('main.ts').returns(true);

            const result = (provider as any)._isTextFile('main.ts');

            expect(result).to.be.true;
            expect(harness.fileHelpersStub.isTextFile.calledOnceWithExactly('main.ts')).to.be.true;
        });

        it('_sendWorkspaceFiles logs when getWorkspaceFiles rejects', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const error = new Error('scan failed');
            sandbox.stub(provider as any, '_getWorkspaceFiles').rejects(error);
            const errorSpy = sandbox.stub(console, 'error');
            (provider as any)._panel = harness.panelStub;

            await (provider as any)._sendWorkspaceFiles();
            await Promise.resolve(); // wait for rejection handler

            expect(errorSpy.calledOnce).to.be.true;
            expect(harness.panelStub.webview.postMessage.called).to.be.false;
        });
    });

    describe('_callBackendAPI', () => {
        it('passes prompt and files to backend client with configured URL', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const files = [{ filename: 'a.ts', content: 'code' }];

            const result = await (provider as any)._callBackendAPI('prompt', files);

            expect(result).to.equal('ok');
            expect(harness.backendClientStub.callBackendAPI.calledOnceWithExactly('prompt', files, 'http://localhost:3001')).to.be.true;
        });
    });

    describe('_getCurrentFile', () => {
        it('returns current editor path when available', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            harness.fileHelpersStub.getActiveEditorPath.returns('src/main.ts');

            const result = (provider as any)._getCurrentFile();

            expect(result).to.equal('src/main.ts');
        });

        it('returns undefined when no active editor', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            harness.fileHelpersStub.getActiveEditorPath.returns(undefined);

            const result = (provider as any)._getCurrentFile();

            expect(result).to.be.undefined;
        });
    });

    describe('_sendWorkspaceFiles', () => {
        it('sends workspace file list to the webview', async () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const files = ['one.ts', 'two.ts'];
            harness.fileHelpersStub.getWorkspaceFiles.resolves(files);
            const sendMessageSpy = sandbox.spy(provider as any, '_sendMessageToWebview');

            await (provider as any)._sendWorkspaceFiles();

            expect(sendMessageSpy.calledOnce).to.be.true;
            expect(sendMessageSpy.getCall(0).args[0]).to.deep.equal({
                type: MESSAGE_TYPES.WORKSPACE_FILES,
                payload: { files },
            });
        });
    });

    describe('_sendCurrentFile', () => {
        it('posts current file details when available', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const sendMessageSpy = sandbox.spy(provider as any, '_sendMessageToWebview');
            sandbox.stub(provider as any, '_getCurrentFile').returns('src/main.ts');

            (provider as any)._sendCurrentFile();

            expect(sendMessageSpy.calledOnceWithExactly({
                type: MESSAGE_TYPES.CURRENT_FILE,
                payload: { file: 'src/main.ts' },
            })).to.be.true;
        });

        it('posts undefined when no current file is available', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const sendMessageSpy = sandbox.spy(provider as any, '_sendMessageToWebview');
            sandbox.stub(provider as any, '_getCurrentFile').returns(undefined);

            (provider as any)._sendCurrentFile();

            expect(sendMessageSpy.calledOnceWithExactly({
                type: MESSAGE_TYPES.CURRENT_FILE,
                payload: { file: undefined },
            })).to.be.true;
        });
    });

    describe('_sendMessageToWebview', () => {
        it('posts messages when panel is defined', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            (provider as any)._panel = harness.panelStub;
            const message = { type: 'test', payload: {} } as any;

            (provider as any)._sendMessageToWebview(message);

            expect(harness.panelStub.webview.postMessage.calledOnceWithExactly(message)).to.be.true;
        });
    });

    describe('_loadChatHistory', () => {
        it('sends stored chat history to the webview', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            (provider as any)._panel = harness.panelStub;
            const messages = [{ type: 'ai', content: 'Hello' }];
            harness.stateStoreStub.getChatHistory.returns(messages);
            const sendMessageSpy = sandbox.spy(provider as any, '_sendMessageToWebview');

            (provider as any)._loadChatHistory();

            expect(sendMessageSpy.calledOnceWithExactly({
                type: MESSAGE_TYPES.LOAD_CHAT_HISTORY,
                payload: { messages },
            })).to.be.true;
        });
    });

    describe('_loadChatHistoryWithDelay', () => {
        it('invokes _loadChatHistory after configured delay', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const loadHistorySpy = sandbox.spy(provider as any, '_loadChatHistory');
            sandbox.useFakeTimers();

            (provider as any)._loadChatHistoryWithDelay();

            sandbox.clock.tick(100);
            expect(loadHistorySpy.calledOnce).to.be.true;
        });
    });

    describe('state store helpers', () => {
        it('_saveChatHistory stores messages', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const messages = [{ type: 'user', content: 'Hi' }];

            (provider as any)._saveChatHistory(messages);

            expect(harness.stateStoreStub.saveChatHistory.calledOnceWithExactly(messages)).to.be.true;
        });

        it('_clearChatHistory clears storage', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);

            (provider as any)._clearChatHistory();

            expect(harness.stateStoreStub.clearChatHistory.calledOnce).to.be.true;
        });
    });

    describe('_getFallbackHtml', () => {
        it('contains basic controls and script reference', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            const html = (provider as any)._getFallbackHtml({} as any, 'script.js');
            expect(html).to.contain('status-button');
            expect(html).to.contain('Clear Chat');
            expect(html).to.contain('script.js');
        });
    });

    describe('dispose', () => {
        it('disposes existing panel and resets reference', () => {
            const harness = setupHarness();
            const provider = new harness.ChatWebviewProvider(harness.extensionUri as any, harness.extensionContext as any);
            harness.panelStub.dispose = sandbox.stub();
            (provider as any)._panel = harness.panelStub;

            provider.dispose();

            expect(harness.panelStub.dispose.calledOnce).to.be.true;
            expect((provider as any)._panel).to.be.undefined;
        });
    });
});
