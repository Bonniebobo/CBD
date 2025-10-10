import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { StatusBar } from './components/StatusBar';
import './App.css';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<string>();
  const [selectedLine, setSelectedLine] = useState<number>();
  const [aiStatus, setAiStatus] = useState<'ready' | 'processing' | 'error'>('ready');

  const handleFileSelect = (fileName: string, lineNumber?: number) => {
    setSelectedFile(fileName);
    setSelectedLine(lineNumber);
  };

  const handleCodeChange = (code: string) => {
    // Simulate AI processing when code changes
    setAiStatus('processing');
    setTimeout(() => {
      setAiStatus('ready');
    }, 1500);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header repoName="ai-code-assistant" isConnected={true} />
      
      <div className="flex flex-1 min-h-0">
        <Sidebar onFileSelect={handleFileSelect} selectedFile={selectedFile} />
        
        <div className="flex flex-1 min-w-0">
          <ChatInterface selectedFile={selectedFile} onFileSelect={handleFileSelect} />
        </div>
      </div>
      
      <StatusBar aiStatus={aiStatus} />
    </div>
  );
}
