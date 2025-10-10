import React from 'react';
import { FileText, Folder, FolderOpen } from 'lucide-react';

interface SidebarProps {
  onFileSelect: (fileName: string, lineNumber?: number) => void;
  selectedFile?: string;
}

export function Sidebar({ onFileSelect, selectedFile }: SidebarProps) {
  const files = [
    { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
    { name: 'components', path: 'src/components', type: 'folder', expanded: true, children: [
      { name: 'Header.tsx', path: 'src/components/Header.tsx', type: 'file' },
      { name: 'Sidebar.tsx', path: 'src/components/Sidebar.tsx', type: 'file' },
      { name: 'ChatInterface.tsx', path: 'src/components/ChatInterface.tsx', type: 'file' },
      { name: 'StatusBar.tsx', path: 'src/components/StatusBar.tsx', type: 'file' }
    ]},
    { name: 'utils', path: 'src/utils', type: 'folder', expanded: false },
    { name: 'types', path: 'src/types', type: 'folder', expanded: false },
    { name: 'hooks', path: 'src/hooks', type: 'folder', expanded: false },
    { name: 'package.json', path: 'package.json', type: 'file' },
    { name: 'README.md', path: 'README.md', type: 'file' },
    { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file' }
  ];

  const renderFile = (file: any, level = 0) => {
    const isSelected = selectedFile === file.path;
    
    return (
      <div key={file.path} style={{ marginLeft: `${level * 16}px` }}>
        <div 
          className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-muted rounded ${
            isSelected ? 'bg-muted' : ''
          }`}
          onClick={() => file.type === 'file' && onFileSelect(file.path)}
        >
          {file.type === 'folder' ? (
            file.expanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span className="text-sm">{file.name}</span>
        </div>
        {file.children && file.expanded && (
          <div>
            {file.children.map((child: any) => renderFile(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-medium">EXPLORER</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {files.map(file => renderFile(file))}
      </div>
    </div>
  );
}
