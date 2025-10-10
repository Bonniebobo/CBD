#!/usr/bin/env node

/**
 * Test script for Gemini LLM integration
 * 
 * This script tests the Gemini API integration with a real API key.
 * Run this after setting up your GEMINI_API_KEY environment variable.
 */

// Load environment variables from .env file
require('dotenv').config();

const LLMService = require('./services/llmService');

// Test files
const testFiles = [
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
    }
];

const testPrompts = [
    'Summarize this React application',
    'What are the main components?',
    'How can I improve this code?',
    'Generate a new user authentication component'
];

async function testGeminiIntegration() {
    console.log('🧪 Testing Gemini LLM Integration');
    console.log('=' .repeat(50));
    
    // Initialize LLM service
    const llmService = new LLMService();
    
    // Check service status
    const status = llmService.getStatus();
    console.log('📊 LLM Service Status:');
    console.log(`   Gemini Available: ${status.geminiAvailable}`);
    console.log(`   API Key Present: ${status.geminiApiKey}`);
    console.log(`   Service: ${status.service}`);
    console.log('');
    
    if (!status.geminiAvailable) {
        console.log('⚠️  Gemini API key not found or invalid.');
        console.log('   To test with real Gemini:');
        console.log('   1. Get API key from: https://makersuite.google.com/app/apikey');
        console.log('   2. Set environment variable: GEMINI_API_KEY=your_key');
        console.log('   3. Restart the backend');
        console.log('');
        console.log('   Testing with mock responses...');
    } else {
        console.log('✅ Gemini API is available! Testing real AI responses...');
    }
    
    let passed = 0;
    let total = 0;
    
    for (const prompt of testPrompts) {
        total++;
        console.log(`\n📤 Testing prompt: "${prompt}"`);
        
        try {
            const startTime = Date.now();
            const response = await llmService.generateResponse(prompt, testFiles, 'src/App.tsx');
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log('✅ Response generated successfully');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Response length: ${response.length} characters`);
            console.log(`   Response preview: ${response.substring(0, 100)}...`);
            
            // Check if it's a real Gemini response or mock
            if (response.startsWith('LLM would say:')) {
                console.log('   Type: Mock response (fallback)');
            } else {
                console.log('   Type: Real Gemini response');
            }
            
            passed++;
        } catch (error) {
            console.log('❌ Request failed with error:', error.message);
        }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log(`📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        if (status.geminiAvailable) {
            console.log('🎉 All Gemini integration tests passed!');
            console.log('✨ Your backend is now using real AI responses!');
        } else {
            console.log('🎉 All mock response tests passed!');
            console.log('✨ Backend is working with fallback responses.');
            console.log('   Add a Gemini API key to enable real AI responses.');
        }
    } else {
        console.log('⚠️  Some tests failed.');
        console.log('   Check the error messages above for details.');
    }
    
    console.log('\n📝 Next steps:');
    if (!status.geminiAvailable) {
        console.log('   1. Get a free Gemini API key from Google AI Studio');
        console.log('   2. Set GEMINI_API_KEY environment variable');
        console.log('   3. Restart the backend');
        console.log('   4. Run this test again to verify real AI responses');
    } else {
        console.log('   1. Test the VS Code extension integration');
        console.log('   2. Send real prompts from the extension');
        console.log('   3. Check both VS Code and backend console logs');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    testGeminiIntegration().catch(console.error);
}

module.exports = {
    testGeminiIntegration
};
