(() => {
    const vscode = acquireVsCodeApi();

    const MESSAGE_TYPES = Object.freeze({
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
    });

    const SAVE_DELAY_MS = 100;
    const WEBVIEW_REQUEST_DELAY_MS = 200;

    const statusState = {
        workspaceFiles: 0,
        currentFile: 'No file selected',
    };

    function postMessage(type, payload = {}) {
        vscode.postMessage({type, payload});
    }

    function parseLineNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : undefined;
    }

    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) {
            return;
        }

        const message = input.value.trim();
        if (!message) {
            return;
        }

        addMessage('user', message);
        input.value = '';
        postMessage(MESSAGE_TYPES.SEND_MESSAGE, {text: message});
    }

    function addMessage(type, content) {
        addMessageWithParsing(type, content, true);
    }

    function addMessageWithParsing(type, content, saveHistory = false) {
        const container = document.getElementById('messages');
        if (!container) {
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? '👤' : '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (type === 'ai') {
            messageDiv.setAttribute('data-raw-content', content);
            parseContentWithCitations(content).forEach((line) => contentDiv.appendChild(line));
        } else {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.innerHTML = parseContent(content);
            contentDiv.appendChild(textDiv);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;

        if (saveHistory) {
            window.setTimeout(saveChatHistory, SAVE_DELAY_MS);
        }
    }

    function parseContent(text) {
        const linkRegex = /\[([^\]]+)\]\(([^:)]+):?(\d+)?\)/g;
        return text.replace(linkRegex, (_match, linkText, fileName, lineNumber) => {
            return `<span class="file-link" data-file="${fileName}" data-line="${lineNumber || ''}">${linkText}</span>`;
        });
    }

    function parseContentWithCitations(text) {
        const lines = text.split('\n');
        const result = [];
        const linkRegex = /\[([^\]]+)\]\(([^:)]+):?(\d+)?\)/g;

        lines.forEach((line) => {
            const lineReferences = [];
            let match;
            let lastIndex = 0;
            let lineContent = '';

            while ((match = linkRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    lineContent += line.slice(lastIndex, match.index);
                }

                const linkText = match[1];
                const fileName = match[2];
                const lineNumber = match[3];

                lineContent += `<span class="file-link" data-file="${fileName}" data-line="${lineNumber || ''}">${linkText}</span>`;

                if (lineNumber) {
                    lineReferences.push({fileName, lineNumber});
                }

                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
                lineContent += line.slice(lastIndex);
            }

            const lineDiv = document.createElement('div');
            lineDiv.className = 'message-line';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'line-content';
            contentDiv.innerHTML = lineContent || line;
            contentDiv.querySelectorAll('.file-link').forEach((el) => {
                const fileAttr = el.getAttribute('data-file') || '';
                const lineAttr = parseLineNumber(el.getAttribute('data-line'));
                el.addEventListener('click', () => openFile(fileAttr, lineAttr));
            });

            lineDiv.appendChild(contentDiv);

            if (lineReferences.length > 0) {
                const citationsDiv = document.createElement('div');
                citationsDiv.className = 'line-citations';

                lineReferences.forEach((ref) => {
                    const citationBtn = document.createElement('button');
                    citationBtn.className = 'file-reference';
                    citationBtn.textContent = `📄 ${ref.fileName}:${ref.lineNumber}`;
                    citationBtn.addEventListener('click', () => openFile(ref.fileName, parseLineNumber(ref.lineNumber)));
                    citationsDiv.appendChild(citationBtn);
                });

                lineDiv.appendChild(citationsDiv);
            }

            result.push(lineDiv);
        });

        return result;
    }

    function openFile(fileName, lineNumber) {
        postMessage(MESSAGE_TYPES.OPEN_FILE, {fileName, lineNumber});
    }

    function updateStatus(text) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = text;
        }
    }

    function renderStatus() {
        const workspaceLabel = statusState.workspaceFiles > 0
            ? `${statusState.workspaceFiles} files indexed`
            : 'Repository idle';
        const fileLabel = statusState.currentFile ? `Editing ${statusState.currentFile}` : 'No file selected';
        updateStatus(`${workspaceLabel} • ${fileLabel}`);
    }

    function loadChatHistory(messages = []) {
        const container = document.getElementById('messages');
        if (!container || messages.length === 0) {
            return;
        }

        const initialMessage = container.querySelector('.message');
        container.innerHTML = '';
        if (initialMessage) {
            container.appendChild(initialMessage);
        }

        messages.forEach((msg) => addMessageWithParsing(msg.type, msg.content));
    }

    function collectMessagesForSave() {
        const container = document.getElementById('messages');
        if (!container) {
            return [];
        }

        const messages = [];
        container.querySelectorAll('.message').forEach((element, index) => {
            if (index === 0) {
                return;
            }

            const avatar = element.querySelector('.message-avatar');
            if (!avatar) {
                return;
            }

            const type = avatar.textContent === '👤' ? 'user' : 'ai';
            if (type === 'user') {
                const content = element.querySelector('.message-text');
                if (content) {
                    messages.push({type, content: content.textContent || content.innerHTML || ''});
                }
            } else {
                const rawContent = element.getAttribute('data-raw-content');
                if (rawContent) {
                    messages.push({type, content: rawContent});
                }
            }
        });

        return messages;
    }

    function saveChatHistory() {
        const messages = collectMessagesForSave();
        if (messages.length === 0) {
            return;
        }

        postMessage(MESSAGE_TYPES.SAVE_CHAT_HISTORY, {messages});
    }

    function clearChat() {
        const container = document.getElementById('messages');
        if (!container) {
            return;
        }

        const initialMessage = container.querySelector('.message');
        container.innerHTML = '';
        if (initialMessage) {
            container.appendChild(initialMessage);
        }

        saveChatHistory();
    }

    function exportChat() {
        const container = document.getElementById('messages');
        if (!container) {
            return;
        }

        const lines = [];
        container.querySelectorAll('.message').forEach((element, index) => {
            if (index === 0) {
                return;
            }
            const avatar = element.querySelector('.message-avatar');
            const content = element.querySelector('.message-text, .line-content');
            if (avatar && content) {
                const label = avatar.textContent === '👤' ? 'User' : 'AI';
                lines.push(`${label}: ${content.textContent}`);
            }
        });

        const blob = new Blob([lines.join('\n\n')], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat-history.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleIncomingMessage(event) {
        const message = event.data;
        switch (message.type) {
            case MESSAGE_TYPES.AI_RESPONSE:
                addMessage('ai', message.payload?.response ?? '');
                break;
            case MESSAGE_TYPES.WORKSPACE_FILES:
                statusState.workspaceFiles = message.payload?.files?.length ?? 0;
                renderStatus();
                break;
            case MESSAGE_TYPES.CURRENT_FILE:
                statusState.currentFile = message.payload?.file || 'No file selected';
                renderStatus();
                break;
            case MESSAGE_TYPES.LOAD_CHAT_HISTORY:
                loadChatHistory(message.payload?.messages ?? []);
                break;
            case MESSAGE_TYPES.INITIAL_MESSAGE: {
                const input = document.getElementById('messageInput');
                if (input && message.payload?.message) {
                    input.value = message.payload.message;
                }
                break;
            }
            default:
                break;
        }
    }

    function attachEventHandlers() {
        const input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.classList.contains('file-link')) {
                const fileName = target.getAttribute('data-file') || '';
                const line = parseLineNumber(target.getAttribute('data-line'));
                openFile(fileName, line);
            }
        });
    }

    function requestWorkspaceContext() {
        postMessage(MESSAGE_TYPES.GET_WORKSPACE_FILES, {});
        postMessage(MESSAGE_TYPES.GET_CURRENT_FILE, {});
        window.setTimeout(() => postMessage(MESSAGE_TYPES.REQUEST_CHAT_HISTORY, {}), WEBVIEW_REQUEST_DELAY_MS);
    }

    function bootstrapFallbackUI() {
        if (!document.getElementById('messages')) {
            return;
        }

        attachEventHandlers();
        requestWorkspaceContext();
        renderStatus();
    }

    window.addEventListener('message', handleIncomingMessage);

    window.clearChat = clearChat;
    window.exportChat = exportChat;

    window.setInitialMessage = (message) => {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = message;
        }
    };

    window.addAIResponse = (response) => {
        addMessage('ai', response);
    };

    window.setWorkspaceFiles = (files) => {
        if (Array.isArray(files)) {
            statusState.workspaceFiles = files.length;
            renderStatus();
        }
    };

    window.setCurrentFile = (file) => {
        statusState.currentFile = file || 'No file selected';
        renderStatus();
    };

    bootstrapFallbackUI();
})();
