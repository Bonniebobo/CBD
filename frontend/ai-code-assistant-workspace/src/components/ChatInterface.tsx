import React, { useState, useEffect } from 'react';
import { Send, Bot, User, FileText, Code } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  files?: string[];
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'assistant',
    content: 'Hello! I\'m your AI coding assistant. I have full awareness of your repository and can help you with code generation, explanations, and refactoring. What would you like to work on?',
  }
];

interface ChatInterfaceProps {
  selectedFile?: string;
  onFileSelect?: (fileName: string, lineNumber?: number) => void;
}

// Component to render text with inline code links and file reference buttons
function MessageContent({ content, onFileSelect }: { content: string; onFileSelect?: (fileName: string, lineNumber?: number) => void }) {
  const handleFileClick = (fileName: string, lineNumber?: number) => {
    if (typeof (window as any).acquireVsCodeApi === 'function') {
      const vscode = (window as any).acquireVsCodeApi();
      vscode.postMessage({
        type: 'openFile',
        fileName: fileName,
        lineNumber: lineNumber
      });
    } else if (onFileSelect) {
      onFileSelect(fileName, lineNumber);
    }
  };

  // Parse content to find code references like [file.tsx:line](file.tsx:line)
  const parseContent = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^:)]+):?(\d+)?\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the clickable link
      const linkText = match[1];
      const fileName = match[2];
      const lineNumber = match[3];
      
      parts.push(
        <button
          key={match.index}
          onClick={() => handleFileClick(fileName, lineNumber ? parseInt(lineNumber) : undefined)}
          className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          title={`Jump to ${fileName}${lineNumber ? `:${lineNumber}` : ''}`}
        >
          {linkText}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // Extract line-level references from a line of text
  interface LineReference {
    fileName: string;
    lineNumber?: string;
    linkText: string;
  }

  const getLineReferences = (line: string): LineReference[] => {
    const linkRegex = /\[([^\]]+)\]\(([^:)]+):?(\d+)?\)/g;
    const references: LineReference[] = [];
    let match;
    
    while ((match = linkRegex.exec(line)) !== null) {
      references.push({
        fileName: match[2],
        lineNumber: match[3],
        linkText: match[1]
      });
    }
    
    return references;
  };

  return (
    <div className="prose prose-sm max-w-none space-y-3">
      {content.split('\n').map((line, i) => {
        const lineReferences = getLineReferences(line);
        
        return (
          <div key={i} className="space-y-2">
            <p className="text-sm leading-relaxed">
              {parseContent(line)}
            </p>
            
            {/* Line-level reference buttons */}
            {lineReferences.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lineReferences.map((ref, refIndex) => (
                  <button
                    key={`${ref.fileName}-${ref.lineNumber}-${refIndex}`}
                    onClick={() => handleFileClick(ref.fileName, ref.lineNumber ? parseInt(ref.lineNumber) : undefined)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 border border-border rounded transition-colors"
                    title={`Jump to ${ref.fileName}${ref.lineNumber ? `:${ref.lineNumber}` : ''}`}
                  >
                    <FileText className="w-3 h-3" />
                    {ref.fileName}{ref.lineNumber && <span className="text-muted-foreground">:{ref.lineNumber}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ChatInterface({ selectedFile, onFileSelect }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState('');
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | undefined>(selectedFile);

  // VS Code API integration
  useEffect(() => {
    // Check if we're running in VS Code webview
    if (typeof (window as any).acquireVsCodeApi === 'function') {
      const vscode = (window as any).acquireVsCodeApi();
      
      // Listen for messages from the extension
      window.addEventListener('message', (event) => {
        const message = event.data;
        switch (message.type) {
          case 'initialMessage':
            if (message.message) {
              setInput(message.message);
            }
            break;
          case 'aiResponse':
            const aiMessage: Message = {
              id: Date.now().toString(),
              type: 'assistant',
              content: message.response
            };
            setMessages(prev => [...prev, aiMessage]);
            break;
          case 'workspaceFiles':
            setWorkspaceFiles(message.files || []);
            break;
          case 'currentFile':
            setCurrentFile(message.file);
            break;
        }
      });

      // Request workspace information
      vscode.postMessage({ type: 'getWorkspaceFiles' });
      vscode.postMessage({ type: 'getCurrentFile' });
    }
  }, []);

  // Update current file when prop changes
  useEffect(() => {
    setCurrentFile(selectedFile);
  }, [selectedFile]);

  const handleSend = () => {
    if (input.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: input
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Check if we're in VS Code webview
      if (typeof (window as any).acquireVsCodeApi === 'function') {
        const vscode = (window as any).acquireVsCodeApi();
        vscode.postMessage({
          type: 'sendMessage',
          text: input
        });
      } else {
        // Fallback to mock response when not in VS Code
        setTimeout(() => {
          let aiResponse: Message;
          
          if (input.toLowerCase().includes('summary') || input.toLowerCase().includes('repository')) {
            aiResponse = {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: 'This is a VS Code extension project for an AI coding assistant. The main components include:\n\n• React Components: [Header component](Header.tsx:8), [Sidebar navigation](Sidebar.tsx:12), and [ChatInterface](ChatInterface.tsx:45) for the UI\n• Core Logic: Main [App function](App.tsx:9) with [useState hooks](App.tsx:10) for state management\n• Package Configuration: Standard VS Code extension setup with OpenAI integration in [package.json](package.json:15)\n\nThe architecture follows a typical VS Code extension pattern with a clean React-based interface defined in the [default export](App.tsx:23).',
              files: ['App.tsx', 'package.json', 'components/Header.tsx', 'components/Sidebar.tsx', 'components/ChatInterface.tsx']
            };
          } else if (input.toLowerCase().includes('generate') || input.toLowerCase().includes('create')) {
            aiResponse = {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: 'I\'ll generate multiple related files for you. Here\'s what I\'m creating:\n\n• User Service: Handle user authentication with [login function](services/UserService.ts:15) and [logout method](services/UserService.ts:28)\n• Type Definitions: TypeScript interfaces for [User type](types/UserTypes.ts:3) and [AuthState](types/UserTypes.ts:12)\n• React Component: User management UI with [UserProfile component](components/UserComponent.tsx:8) and [login form](components/UserComponent.tsx:45)\n\nThese files work together to provide a complete user management system. You\'ll need to import the UserComponent in your [main App component](App.tsx:23).',
              files: ['services/UserService.ts', 'types/UserTypes.ts', 'components/UserComponent.tsx']
            };
          } else if (input.toLowerCase().includes('explain') || input.toLowerCase().includes('what')) {
            aiResponse = {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: `This ${currentFile ? `[${currentFile}](${currentFile})` : 'code'} implements the main application structure.\n\nThe component uses React hooks for state management with [useState for selectedFile](${currentFile || 'App.tsx'}:10) and [useState for aiStatus](${currentFile || 'App.tsx'}:11).\n\nThe layout structure is defined in the [main App function](${currentFile || 'App.tsx'}:9) with proper component composition and [event handlers](${currentFile || 'App.tsx'}:13).`
            };
          } else {
            aiResponse = {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: 'I understand your request. Let me analyze your codebase and provide a helpful response based on the current context.\n\nThe main application structure is defined in [App.tsx with imports](App.tsx:1) and [component setup](App.tsx:9).\n\nThe project uses a typical React component architecture with separate files for [Header component](Header.tsx:5), [Sidebar navigation](Sidebar.tsx:8), and [ChatInterface logic](ChatInterface.tsx:12).'
            };
          }
          
          setMessages(prev => [...prev, aiResponse]);
        }, 1000);
      }
      
      setInput('');
    }
  };

  return (
    <div className="w-full bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <h3>AI Assistant</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Repository-aware coding assistant
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map(message => (
          <div key={message.id} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                {message.type === 'user' ? 
                  <User className="w-5 h-5" /> : 
                  <Bot className="w-5 h-5 text-primary" />
                }
              </div>
              <div className="flex-1 space-y-3">
                <MessageContent content={message.content} onFileSelect={onFileSelect} />
                
                {message.files && message.files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      Generated Files
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {message.files.map(file => (
                        <button
                          key={file}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 border border-border rounded transition-colors"
                          onClick={() => handleFileClick(file)}
                        >
                          <FileText className="w-3 h-3" />
                          {file}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your code, generate files, or get explanations..."
            className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          {workspaceFiles.length > 0 ? `${workspaceFiles.length} files indexed` : 'Repository indexed'} • {currentFile ? `Editing ${currentFile}` : 'No file selected'}
        </div>
      </div>
    </div>
  );
}
