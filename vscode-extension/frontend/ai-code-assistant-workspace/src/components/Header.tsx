import React from 'react';
import { Menu, Search, Settings } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
      <div className="flex items-center gap-2">
        <Menu className="w-5 h-5" />
        <span className="font-medium">AI Code Assistant</span>
      </div>
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5" />
        <Settings className="w-5 h-5" />
      </div>
    </header>
  );
}
