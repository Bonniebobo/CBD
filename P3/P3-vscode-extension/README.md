Resources:
* https://code.visualstudio.com/api/get-started/your-first-extension
* https://github.com/microsoft/vscode-copilot-chat

Steps
1. Build and run the extension:
`cd "ai-chatbot-extension" && npm install & npm run compile`

2. Open the extension:
* `cd "ai-chatbot-extension" && code .` Use VS Code to open this folder.
* Press `F5` in VS Code or click to "Run and Debug" button on the sidebar to click "Run Extension" which open a window of Extension Development Host
* Open AI Assistant (robot icon in activity bar or `Ctrl+Shift+P` → "Open AI Chat")

3. Test file opening:
* Open folder in workspace `ai-code-assistant-workspace`
* Ask for a repository summary: "Give me a summary of this repository"
* Click on any file reference (e.g., Header component)

4. For Debugging; Open Developer Console:
* In the Extension Development Host window, press `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac)
* Go to the Console tab