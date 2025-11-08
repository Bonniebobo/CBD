# AI Code Assistant

A VS Code extension project for an AI coding assistant with repository awareness.

## Features

- Repository-aware AI assistant with full workspace access
- Interactive chat interface with file navigation
- Real-time code analysis and suggestions
- File reference links with line number citations
- Component-based React architecture

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # Application header with navigation
│   ├── Sidebar.tsx     # File explorer sidebar
│   ├── ChatInterface.tsx # Main chat interface
│   └── StatusBar.tsx   # Status bar with AI state
├── App.tsx             # Main application component
├── App.css             # Application styles
└── index.tsx           # Application entry point
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local development URL.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## Technologies Used

- React 18
- TypeScript
- Vite
- Lucide React (icons)
- OpenAI API integration

## AI Assistant Features

- **Repository Analysis**: Understands project structure and file relationships
- **Code Generation**: Creates new files and components based on requirements
- **Code Explanation**: Provides detailed explanations with line references
- **File Navigation**: Click on file references to jump to specific locations
- **Context Awareness**: Maintains awareness of current file and workspace state
