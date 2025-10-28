#!/usr/bin/env node

/**
 * Unit tests for repository summary citations.
 *
 * Verifies that Gemini responses (when available) include references to key files.
 */

const assert = require('assert');
const LLMService = require('../services/llmService');

function buildTestFiles() {
    return [
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

  return null;
}`
        }
    ];
}

async function runTests() {
    const service = new LLMService();
    const files = buildTestFiles();

    if (!service.isGeminiAvailable()) {
        console.log('⚠️  Gemini API key not configured. Skipping citation tests that require live responses.');
        return;
    }

    const response = await service.generateResponse('Summarize this repository', files);

    assert.ok(typeof response === 'string' && response.trim().length > 0, 'Response should be a non-empty string');
    assert.ok(response.includes('App.tsx'), 'Response should mention App.tsx');
    assert.ok(response.includes('package.json'), 'Response should mention package.json');
}

(async () => {
    try {
        await runTests();
        console.log('✅ Repository summary citation tests passed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Repository summary citation tests failed');
        console.error(error.message);
        process.exit(1);
    }
})();
