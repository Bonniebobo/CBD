import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StatusBarProps {
  aiStatus: 'ready' | 'processing' | 'error';
}

export function StatusBar({ aiStatus }: StatusBarProps) {
  const getStatusIcon = () => {
    switch (aiStatus) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    switch (aiStatus) {
      case 'ready':
        return 'AI Ready';
      case 'processing':
        return 'AI Processing...';
      case 'error':
        return 'AI Error';
      default:
        return 'AI Ready';
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background border-t border-border text-sm">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>42 files indexed</span>
        <span>TypeScript React</span>
      </div>
    </div>
  );
}
