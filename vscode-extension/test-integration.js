#!/usr/bin/env node

/**
 * Integration Test Script for VS Code Extension + Backend
 * 
 * This script simulates the VS Code extension calling the backend
 * to verify the integration works correctly.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BACKEND_URL = 'http://localhost:3001';

// Mock workspace files (similar to what VS Code extension would send)
const mockWorkspaceFiles = [
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
}`
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
}`
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
  const [messages, setMessages] = useState<Message[]>(mockMessages);
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
}`
    }
];

// Test prompts that the VS Code extension might send
const testPrompts = [
    'Summarize this React application',
    'Explain the component structure',
    'What are the main dependencies?',
    'How can I improve this code?',
    'Generate a new authentication component'
];

// HTTP request helper (similar to VS Code extension)
function makeHttpRequest(url, data) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(url);
            const postData = JSON.stringify(data);

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            const parsed = JSON.parse(responseData);
                            resolve({ success: true, data: parsed });
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        }
                    } catch (parseError) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        } catch (error) {
            reject(error);
        }
    });
}

// Test function
async function testExtensionBackendIntegration() {
    console.log('🧪 Testing VS Code Extension + Backend Integration');
    console.log('=' .repeat(60));
    
    let passed = 0;
    let total = 0;
    
    for (const prompt of testPrompts) {
        total++;
        console.log(`\n📤 Testing prompt: "${prompt}"`);
        
        try {
            const result = await makeHttpRequest(`${BACKEND_URL}/upload`, {
                files: mockWorkspaceFiles,
                prompt: prompt
            });
            
            if (result.success && result.data.mockResponse) {
                console.log('✅ Request successful');
                console.log(`   Files sent: ${mockWorkspaceFiles.length}`);
                console.log(`   Response: ${result.data.mockResponse.substring(0, 100)}...`);
                console.log(`   Metadata: ${result.data.metadata.filesProcessed} files processed`);
                
                // Check for directory tree
                if (result.data.directoryTree) {
                    console.log(`   Directory tree: ${Object.keys(result.data.directoryTree).length} root items`);
                    console.log(`   Tree structure: ${JSON.stringify(result.data.directoryTree).substring(0, 150)}...`);
                } else {
                    console.log('   ⚠️  No directory tree in response');
                }
                
                passed++;
            } else {
                console.log('❌ Request failed - invalid response format');
                console.log(`   Response: ${JSON.stringify(result.data)}`);
            }
        } catch (error) {
            console.log('❌ Request failed with error:', error.message);
        }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📊 Integration Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All integration tests passed!');
        console.log('\n✨ Your VS Code extension is ready to use with the backend!');
        console.log('\n📝 Next steps:');
        console.log('   1. Make sure the backend is running: npm start (in backend/)');
        console.log('   2. Load the VS Code extension in VS Code');
        console.log('   3. Open the AI Chatbot panel');
        console.log('   4. Send a message to test the integration');
        console.log('   5. Check both VS Code console and backend console for logs');
    } else {
        console.log('⚠️  Some integration tests failed.');
        console.log('   Make sure the backend server is running on port 3001');
        console.log('   Check the backend console for any error messages');
    }
}

// Check if backend is running
async function checkBackendHealth() {
    return new Promise((resolve) => {
        const url = new URL(`${BACKEND_URL}/health`);
        const client = url.protocol === 'https:' ? https : http;
        
        const req = client.request({
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.status === 'healthy');
                } catch {
                    resolve(false);
                }
            });
        });
        
        req.on('error', () => resolve(false));
        req.end();
    });
}

// Main execution
async function main() {
    console.log('🔍 Checking backend health...');
    const isHealthy = await checkBackendHealth();
    
    if (!isHealthy) {
        console.log('❌ Backend is not running or not healthy');
        console.log('   Please start the backend first:');
        console.log('   cd backend && npm start');
        process.exit(1);
    }
    
    console.log('✅ Backend is healthy and running');
    await testExtensionBackendIntegration();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testExtensionBackendIntegration,
    checkBackendHealth,
    makeHttpRequest
};
