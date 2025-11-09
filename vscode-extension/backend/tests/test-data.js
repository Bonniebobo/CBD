/**
 * Shared Test Data for Integration and Unit Tests
 *
 * Contains mock files and prompts used across test suites.
 */

const mockFiles = [
    {
        filename: 'src/App.tsx',
        content: `import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<string>();
  const [aiStatus, setAiStatus] = useState('ready');

  return (
    <div className="flex h-screen bg-background">
      <Sidebar onFileSelect={setSelectedFile} />
      <div className="flex-1 flex flex-col">
        <Header />
        <ChatInterface selectedFile={selectedFile} />
      </div>
    </div>
  );
}`,
    },
    {
        filename: 'package.json',
        content: `{
  "name": "ai-code-assistant-workspace",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}`,
    },
    {
        filename: 'src/components/ChatInterface.tsx',
        content: `import React, { useState, useEffect } from 'react';
import { Send, Bot, User, FileText, Code } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  files?: string[];
}

export function ChatInterface({ selectedFile, onFileSelect }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | undefined>(selectedFile);

  const handleSend = () => {
    if (input.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: input
      };
      
      setMessages(prev => [...prev, newMessage]);
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
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
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
          {workspaceFiles.length > 0 ? workspaceFiles.length + ' files indexed' : 'Repository indexed'} • {currentFile ? 'Editing ' + currentFile : 'No file selected'}
        </div>
      </div>
    </div>
  );
}`,
    },
];

const mockPrompts = [
    'Summarize this repository',
    'Explain how the React components work',
    'Generate a new user authentication component',
    'What are the main dependencies in this project?',
    'How can I improve the code structure?',
    'What does this code do?',
    'Is there a bug in this file?',
    'Refactor this component to use hooks',
    'Add TypeScript types to this file',
    'Optimize the performance of this code',
];

module.exports = {
    mockFiles,
    mockPrompts,
};

