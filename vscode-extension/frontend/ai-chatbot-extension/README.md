# AI Chatbot VS Code Extension

A VS Code extension that integrates your React-based AI chatbot as a native extension with full workspace awareness.

## Features

- **Repository-aware AI Assistant**: The chatbot has full access to your workspace files and can reference them in conversations
- **File Navigation**: Click on file references in AI responses to jump directly to files and specific lines
- **Multiple Access Points**: 
  - Sidebar view in the Explorer
  - Command palette commands
  - Context menu integration
- **Workspace Integration**: Automatically indexes your repository and provides context-aware responses

## Installation

### Development Installation

1. Clone or navigate to the extension directory:
   ```bash
   cd ai-chatbot-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Open the extension in VS Code:
   - Press `F5` to open a new Extension Development Host window
   - Or use `Ctrl+Shift+P` → "Developer: Reload Window" in your main VS Code

### Production Installation

1. Package the extension:
   ```bash
   npm run vscode:prepublish
   ```

2. Install the `.vsix` file:
   ```bash
   code --install-extension ai-chatbot-extension-0.1.0.vsix
   ```

## Usage

### Opening the AI Chat

1. **From Sidebar**: Look for "AI Assistant" in the Explorer sidebar
2. **From Command Palette**: 
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "AI Chatbot" and select "Open AI Chat"
3. **From Context Menu**: Right-click on selected text in the editor and choose "Open AI Chat in Editor"

### Features

- **Repository Analysis**: Ask the AI to analyze your codebase structure
- **Code Generation**: Request code generation with full context awareness
- **File References**: Click on any file reference in AI responses to navigate directly
- **Workspace Context**: The AI automatically knows about your current file and workspace

### Configuration

Access settings via `File` → `Preferences` → `Settings` → search for "AI Chatbot":

- `ai-chatbot.apiKey`: Your AI service API key
- `ai-chatbot.model`: AI model to use (default: gpt-3.5-turbo)
- `ai-chatbot.enableRepositoryAnalysis`: Enable/disable repository analysis features

## Architecture

The extension consists of:

1. **Extension Host** (`src/extension.ts`): Main extension entry point
2. **Webview Provider** (`src/chatWebviewProvider.ts`): Manages the React app webview
3. **Tree View Provider** (`src/chatViewProvider.ts`): Provides sidebar integration
4. **React App**: Your existing chatbot UI, built and integrated as a webview

## Development

### Building the React App

The React app is located in the parent directory. To rebuild:

```bash
cd "../VS Code AI Chatbot Extension"
npm run build
```

### Extension Development

- `npm run compile`: Compile TypeScript
- `npm run watch`: Watch for changes and recompile
- `npm run lint`: Run ESLint

### Testing

1. Open the extension folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Test the extension features in the new window

## Integration Details

The extension integrates your React app by:

1. **Building the React app** to static files
2. **Serving the built files** through VS Code's webview system
3. **Adding VS Code API integration** to the React app for:
   - File system access
   - Workspace information
   - File navigation
   - Message passing between extension and webview

## Troubleshooting

### Extension Not Loading

- Ensure the React app is built: `npm run build` in the React app directory
- Check that the extension compiled successfully: `npm run compile`
- Reload the window: `Ctrl+Shift+P` → "Developer: Reload Window"

### React App Not Displaying

- Verify the build directory exists and contains `index.html`
- Check the browser console for errors (F12 in the webview)
- Ensure all file paths are correct in the webview provider

### File Navigation Not Working

- Check that the VS Code API integration is properly set up
- Verify message passing between webview and extension
- Ensure file paths are relative to the workspace root

## Contributing

1. Make changes to the React app in the parent directory
2. Rebuild the React app: `npm run build`
3. Make changes to the extension code
4. Compile the extension: `npm run compile`
5. Test in Extension Development Host

## License

MIT License - see LICENSE file for details.
