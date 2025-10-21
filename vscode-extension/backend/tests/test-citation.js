#!/usr/bin/env node

/**
 * Unit tests for repository summary citations.
 *
 * Verifies that the mock LLM response includes clickable file and line references
 * in the Markdown format expected by the VS Code webview.
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

function extractReference(summary, filename) {
    const regex = new RegExp(`\\[${filename.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\]\\(${filename.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}:([0-9]+)\\)`);
    const match = summary.match(regex);
    return match ? Number(match[1]) : null;
}

function runTests() {
    const service = new LLMService();
    const files = buildTestFiles();
    const response = service.generateMockResponse('Summarize this repository', files);

    assert.ok(typeof response === 'string', 'Response should be a string');
    assert.ok(response.includes('**Key Files with line references:**'), 'Summary should include key files section');

    const appLine = extractReference(response, 'App.tsx');
    assert.ok(appLine && Number.isInteger(appLine) && appLine > 0, 'App.tsx reference should include a positive line number');

    const chatInterfaceLine = extractReference(response, 'src/components/ChatInterface.tsx');
    assert.ok(chatInterfaceLine && Number.isInteger(chatInterfaceLine) && chatInterfaceLine > 0, 'ChatInterface reference should include a positive line number');

    // Ensure package.json gets cited with a line reference as well
    const packageLine = extractReference(response, 'package.json');
    assert.ok(packageLine && Number.isInteger(packageLine) && packageLine > 0, 'package.json reference should include a positive line number');

    const referenceMatches = response.match(/\[[^\]]+\]\([^)]+:\d+\)/g) || [];
    assert.ok(referenceMatches.length > 0, 'Summary should include at least one clickable reference');
    assert.ok(referenceMatches.length <= 5, 'Summary should not include more than five key file references');
}

(async () => {
    try {
        runTests();
        console.log('✅ Repository summary citation tests passed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Repository summary citation tests failed');
        console.error(error.message);
        process.exit(1);
    }
})();
