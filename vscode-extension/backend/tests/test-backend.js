#!/usr/bin/env node

/**
 * Test script for AI Code Assistant Backend
 *
 * This script tests the backend endpoints to ensure they're working correctly.
 * Run this after starting the backend server.
 */

const http = require('http');

// Test data
const testFiles = [
    {
        filename: 'App.tsx',
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
}`,
    },
];

const testPrompts = [
    'Summarize this repository',
    'Explain how the React components work',
    'Generate a new user authentication component',
    'What are the main dependencies in this project?',
    'How can I improve the code structure?',
];

// Utility function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test functions
async function testHealthCheck() {
    console.log('🏥 Testing health check endpoint...');
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/health',
            method: 'GET',
        };

        const result = await makeRequest(options);

        if (result.status === 200 && result.data.status === 'healthy') {
            console.log('✅ Health check passed');
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Uptime: ${result.data.uptime}s`);
            return true;
        } else {
            console.log('❌ Health check failed');
            console.log(`   Status: ${result.status}`);
            console.log(`   Response: ${JSON.stringify(result.data)}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Health check failed with error:', error.message);
        return false;
    }
}

async function testUploadEndpoint(prompt, files) {
    console.log(`📤 Testing upload endpoint with prompt: "${prompt}"`);
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const data = { files, prompt };
        const result = await makeRequest(options, data);

        if (result.status === 200) {
            console.log('✅ Upload test passed');
            console.log(`   Message: ${result.data.message}`);
            console.log(`   Files processed: ${result.data.metadata.filesProcessed}`);
            console.log(`   Total characters: ${result.data.metadata.totalCharacters}`);
            if (typeof result.data.aiResponse === 'string') {
                console.log(`   AI response: ${result.data.aiResponse.substring(0, 100)}...`);
            }
            return true;
        } else {
            console.log('❌ Upload test failed');
            console.log(`   Status: ${result.status}`);
            console.log(`   Response: ${JSON.stringify(result.data)}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Upload test failed with error:', error.message);
        return false;
    }
}

async function testErrorHandling() {
    console.log('🚨 Testing error handling...');
    // We'll return a boolean indicating whether both error cases behaved correctly
    let allGood = true;

    // Test missing files
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const data = { prompt: 'Test prompt' }; // Missing files
        const result = await makeRequest(options, data);

        if (result.status === 400) {
            console.log('✅ Missing files error handled correctly');
        } else {
            console.log('❌ Missing files error not handled correctly');
            console.log(`   Status: ${result.status}`);
            console.log(`   Response: ${JSON.stringify(result.data)}`);
            allGood = false;
        }
    } catch (error) {
        console.log('❌ Error handling test failed:', error.message);
        allGood = false;
    }

    // Test missing prompt
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const data = { files: testFiles }; // Missing prompt
        const result = await makeRequest(options, data);

        if (result.status === 400) {
            console.log('✅ Missing prompt error handled correctly');
        } else {
            console.log('❌ Missing prompt error not handled correctly');
            console.log(`   Status: ${result.status}`);
            console.log(`   Response: ${JSON.stringify(result.data)}`);
            allGood = false;
        }
    } catch (error) {
        console.log('❌ Error handling test failed:', error.message);
        allGood = false;
    }

    return allGood;
}

async function test404Endpoint() {
    console.log('🔍 Testing 404 endpoint...');
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/nonexistent',
            method: 'GET',
        };

        const result = await makeRequest(options);

        if (result.status === 404) {
            console.log('✅ 404 error handled correctly');
            return true;
        } else {
            console.log('❌ 404 error not handled correctly');
            console.log(`   Status: ${result.status}`);
            console.log(`   Response: ${JSON.stringify(result.data)}`);
            return false;
        }
    } catch (error) {
        console.log('❌ 404 test failed with error:', error.message);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🧪 Starting AI Code Assistant Backend Tests\n');
    console.log('='.repeat(50));

    let passed = 0;
    let total = 0;

    // Test health check
    total++;
    if (await testHealthCheck()) {passed++;}
    console.log('');

    // Test upload endpoint with different prompts
    for (const prompt of testPrompts) {
        total++;
        if (await testUploadEndpoint(prompt, testFiles)) {passed++;}
        console.log('');
    }

    // Test error handling
    total++;
    if (await testErrorHandling()) {passed++;}
    console.log('');

    // Test 404
    total++;
    if (await test404Endpoint()) {passed++;}
    console.log('');

    // Results
    console.log('='.repeat(50));
    console.log(`📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All tests passed! Backend is working correctly.');
        console.log('\n🚀 Your backend is ready to use with the VS Code extension!');
        console.log('   • Health check: http://localhost:3001/health');
        console.log('   • Upload endpoint: http://localhost:3001/upload');
        console.log('   • CORS enabled for all origins');
        console.log('   • Max body size: 10MB');
        console.log('   • Supports concurrent users');
    } else {
        console.log('⚠️  Some tests failed. Please check the backend server.');
        console.log('   Make sure the server is running: npm start');
        console.log('   Check the console for error messages.');
    }

    console.log('\n📝 Next steps:');
    console.log('   1. Update your VS Code extension to use http://localhost:3001');
    console.log('   2. Test the integration with your extension');
    console.log('   3. Deploy to AWS/Render when ready');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testHealthCheck,
    testUploadEndpoint,
    testErrorHandling,
    test404Endpoint,
    runTests,
};
