# VS Code Extension + Backend Integration Guide

This guide explains how to use the updated VS Code extension with the backend server for AI-powered code analysis.

## 🚀 Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm install
npm start
```

The backend will run on `http://localhost:3001`

### 2. Load the VS Code Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Click "Load Extension" and select the `ai-chatbot-extension` folder
4. Or press F5 to run the extension in development mode

### 3. Open the AI Chatbot

1. Look for the AI Assistant icon in the Activity Bar (left sidebar)
2. Click on it to open the AI Chatbot panel
3. Or use the command palette (Ctrl+Shift+P) and search for "AI Chatbot"

## 🔧 Configuration

The extension has a new configuration option for the backend URL:

1. Open VS Code Settings (Ctrl+,)
2. Search for "ai-chatbot"
3. Set the `Backend URL` to your backend server URL (default: `http://localhost:3001`)

Or add to your `settings.json`:
```json
{
  "ai-chatbot.backendUrl": "http://localhost:3001"
}
```

## 📤 How It Works

### File Reading Process

1. **User sends a message** in the AI Chatbot panel
2. **Extension reads workspace files** using `vscode.workspace.fs.readFile()`
3. **Files are filtered** to include only text files (code, config, docs)
4. **Large files are excluded** (>50KB) to avoid payload issues
5. **Files are sent to backend** via HTTP POST to `/upload`

### Backend Communication

The extension sends a JSON payload like this:
```json
{
  "files": [
    {
      "filename": "src/App.tsx",
      "content": "import React from 'react';\n\nexport default function App() {\n  return <div>Hello World</div>;\n}"
    },
    {
      "filename": "package.json",
      "content": "{\n  \"name\": \"my-app\",\n  \"version\": \"1.0.0\"\n}"
    }
  ],
  "prompt": "Summarize this React application"
}
```

### Response Handling

The backend responds with:
```json
{
  "message": "Successfully processed 2 files.",
  "aiResponse": "Real Gemini AI response here...",
  "metadata": {
    "filesProcessed": 2,
    "totalCharacters": 156,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🧪 Testing

### Running Backend Tests Locally

The backend uses **Jest** as the testing framework for unit tests.

#### Prerequisites

1. **Node.js**: Version 16.0.0 or higher
2. **Dependencies**: All dependencies are installed via `npm install`, including:
   - `jest` (^29.7.0) - Testing framework
   - `supertest` (^7.1.3) - HTTP assertion library for integration tests
   - `@eslint/js` (^9.15.0) - ESLint for code quality

#### Installation

```bash
cd vscode-extension/backend
npm install
```

#### Running Tests

**Run all unit tests with coverage:**
```bash
npm test
```

**Run tests in watch mode (re-runs on file changes):**
```bash
npm run test:watch
```

**Run API integration tests (requires server to be running):**
```bash
# Terminal 1: Start the backend server
npm start

# Terminal 2: Run integration tests
npm run test:integration
```

**Run all tests (unit + integration):**
```bash
# Terminal 1: Start the backend server
npm start

# Terminal 2: Run all tests
npm run test:all
```

**Run specific test file:**
```bash
npm test -- tests/unit/llmService.test.js
```

**Run tests with coverage report:**
```bash
npm test -- --coverage
```

The coverage report will be generated in the `coverage/` directory. Target coverage is 80%+.

#### Test Structure

- **Unit Tests**: Located in `tests/unit/` - Fast tests with mocked dependencies
- **Integration Tests**: Located in `tests/integration/` - Tests that require the server to be running

### Running Frontend Tests Locally

The frontend (VS Code extension) uses **Mocha** as the testing framework with **Chai** for assertions and **Sinon** for mocking.

#### Prerequisites

1. **Node.js**: Version 16.0.0 or higher
2. **Dependencies**: All dependencies are installed via `npm install`, including:
   - `mocha` (^10.4.0) - Testing framework
   - `chai` (^4.4.1) - Assertion library
   - `sinon` (^17.0.1) - Mocking and spying library
   - `ts-node` (^10.9.2) - TypeScript execution for Node.js
   - `proxyquire` (^2.1.3) - Module mocking for Node.js
   - `@types/mocha`, `@types/chai`, `@types/sinon` - TypeScript type definitions

#### Installation

```bash
cd vscode-extension/frontend/ai-chatbot-extension
npm install
```

#### Running Tests

**Compile TypeScript source code:**
```bash
npm run compile
```

**Run all tests:**
```bash
npx mocha 'tests/**/*.spec.ts'
```

Or using the Mocha configuration file (`.mocharc.json`):
```bash
npx mocha
```

**Run specific test file:**
```bash
npx mocha tests/chatWebViewProvider.spec.ts
npx mocha tests/fileHelper.spec.ts
```

**Run tests with TypeScript compilation:**
The tests use `ts-node` to compile TypeScript on the fly. The `.mocharc.json` configuration file automatically handles this.

#### Test Structure

- **Test Files**: Located in `tests/` directory with `.spec.ts` extension
- **Test Configuration**: Uses `tsconfig.test.json` which extends the main `tsconfig.json` and includes both `src/` and `tests/` directories
- **Mocha Configuration**: `.mocharc.json` configures Mocha to use `ts-node/register` for TypeScript support

#### Troubleshooting Frontend Tests

If you encounter module resolution issues:
1. Ensure all dependencies are installed: `npm install`
2. Verify TypeScript compilation works: `npm run compile`
3. Check that `tsconfig.test.json` exists and is properly configured
4. Ensure `.mocharc.json` is present in the project root

### Run Integration Tests

```bash
# Make sure backend is running first
cd backend && npm start

# In another terminal, run the integration test
cd frontend
node test-integration.js
```

### Manual Testing

1. **Start both services:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm start
   
   # Terminal 2: VS Code Extension (F5 in VS Code)
   ```

2. **Test in VS Code:**
   - Open a project with code files
   - Open the AI Chatbot panel
   - Send messages like:
     - "Summarize this repository"
     - "Explain the main components"
     - "What are the dependencies?"
     - "Generate a new component"

3. **Check logs:**
   - **VS Code Console:** View → Output → "AI Chatbot"
   - **Backend Console:** Terminal running `npm start`

## 🔍 Debugging

### VS Code Extension Logs

1. Open VS Code Developer Tools (Help → Toggle Developer Tools)
2. Go to Console tab
3. Look for messages starting with `[AI Chatbot]`

### Backend Logs

The backend provides detailed console logs:
```
=== NEW UPLOAD REQUEST ===
Prompt: "Summarize this repository"
Files received: 3
  1. App.tsx
     Size: 602 characters
     Type: tsx
  2. package.json
     Size: 478 characters
     Type: json
  3. src/components/ChatInterface.tsx
     Size: 3136 characters
     Type: tsx
Response generated successfully
=== END REQUEST ===
```

### Common Issues

1. **Backend not running or Gemini key missing:**
   - Error: "Failed to contact the Gemini backend: ..."
   - Solution: Start the backend with `npm start` in the `backend/` folder and ensure `GEMINI_API_KEY` is configured

2. **CORS errors:**
   - Error: Network request failed
   - Solution: Backend CORS is configured for all origins, check if port 3001 is available

3. **Large file uploads:**
   - Error: Request timeout
   - Solution: Extension limits files to 50KB, backend limits to 10MB

4. **No files sent:**
   - Check if workspace has text files
   - Verify file extensions are supported
   - Check VS Code console for file reading errors

## 📁 File Support

The extension supports these file types:
- **Code:** `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.java`, `.cpp`, `.c`, `.cs`, `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt`
- **Config:** `.json`, `.yaml`, `.yml`, `.config`, `.env`
- **Web:** `.html`, `.css`, `.scss`, `.vue`, `.svelte`, `.astro`
- **Docs:** `.md`, `.txt`
- **Other:** `.xml`, `.gitignore`, `.dockerfile`

## 🚀 Deployment

### Local Development
- Backend: `http://localhost:3001`
- Extension: Loaded in VS Code development mode

### Production Deployment

1. **Deploy Backend:**
   ```bash
   cd backend
   ./deploy.sh  # Follow the deployment instructions
   ```

2. **Update Extension Configuration:**
   - Change `ai-chatbot.backendUrl` to your deployed backend URL
   - Package and publish the extension

3. **Test Integration:**
   - Install the published extension
   - Verify it connects to your deployed backend

## 🔮 Future Enhancements

The current implementation integrates with Google's Gemini API for real responses. Future versions could include:

- **Streaming Responses:** Real-time response streaming
- **User Authentication:** API key management
- **Chat History:** Persistent conversation storage
- **File Filtering:** More sophisticated file selection
- **Caching:** Response caching for better performance

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review console logs in both VS Code and backend
3. Run the integration test: `node test-integration.js`
4. Verify backend health: `curl http://localhost:3001/health`

## 🎉 Success!

When everything is working correctly, you should see:

1. **VS Code Extension:** AI Chatbot panel opens and accepts messages
2. **Backend Console:** Shows incoming requests with file details
3. **AI Responses:** Context-aware responses based on your codebase
4. **File Integration:** Clickable file references in responses

Your AI-powered VS Code extension is now ready to help you understand and work with your codebase! 🚀
