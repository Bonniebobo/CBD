# AI Code Assistant Backend

A Node.js + Express backend API for the AI Code Assistant VS Code Extension. This backend receives project files and user prompts from the VS Code extension and provides AI-powered responses using Google's Gemini 2.5 Flash model.

The backend analyzes your codebase structure, generates contextual AI responses, and provides clickable citations that link directly to specific code locations.

## Features

- **File Upload Endpoint**: Accepts project files and user prompts via POST `/upload`
- **Directory Tree Generation**: Creates hierarchical tree structure with file previews
- **File Previews**: Shows first 3 non-empty lines of code for each file
- **Gemini 2.5 Flash Integration**: Real AI responses using Google's Gemini 2.5 Flash model
- **Code Citations**: AI responses include clickable links to code locations
- **CORS Support**: Configured for VS Code extension communication
- **Request Logging**: Detailed console logging for debugging
- **Large File Support**: Handles up to 10MB uploads
- **Error Handling**: Comprehensive error handling with informative messages
- **Health Check**: `/health` endpoint for monitoring with LLM status

## Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- Gemini API key for real AI responses

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Gemini API key:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your Gemini API key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

5. Test the backend:
   ```bash
   npm test
   
   # Or run individual test suites
   npm run test:citation      # Citation format tests
   npm run test:backend       # Backend functionality tests
   npm run test:integration   # Integration tests
   npm run test:gemini        # Gemini API tests
   ```

### Quick Deployment

Run the deployment helper script:
```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Check your Node.js environment
- Verify dependencies
- Install missing packages
- Run all tests
- Provide deployment instructions and best practices

### Server Information

- **Port**: 3001 (default) or `PORT` environment variable
- **Health Check**: http://localhost:3001/health
- **Upload Endpoint**: http://localhost:3001/upload

## API Endpoints

### POST /upload

Accepts project files and user prompts for AI processing.

**Request Body:**
```json
{
  "files": [
    {
      "filename": "App.tsx",
      "content": "import React from 'react';\n\nexport default function App() {\n  return <div>Hello World</div>;\n}"
    },
    {
      "filename": "package.json",
      "content": "{\n  \"name\": \"my-app\",\n  \"version\": \"1.0.0\"\n}"
    }
  ],
  "prompt": "Summarize this repository"
}
```

**Response:**
```json
{
  "message": "Successfully processed 2 files.",
  "aiResponse": "This is a React application with TypeScript. The main component is located in [src/App.tsx](src/App.tsx:3) which exports a simple functional component...",
  "directoryTree": {
    "src": {
      "type": "directory",
      "children": {
        "App.tsx": {
          "type": "file",
          "size": 94,
          "extension": "tsx",
          "preview": ["import React from \"react\";", "export default function App() {", "return <div>Hello World</div>;"],
          "fullContent": "import React from \"react\";\n\nexport default function App() {\n  return <div>Hello World</div>;\n}"
        }
      }
    },
    "package.json": {
      "type": "file",
      "size": 44,
      "extension": "json",
      "preview": ["{", "\"name\": \"my-app\",", "\"version\": \"1.0.0\""],
      "fullContent": "{\n  \"name\": \"my-app\",\n  \"version\": \"1.0.0\"\n}"
    }
  },
  "llmStatus": {
    "geminiAvailable": true,
    "geminiApiKey": true,
    "service": "LLMService"
  },
  "metadata": {
    "filesProcessed": 2,
    "totalCharacters": 138,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

## Testing

### Automated Tests

The backend includes comprehensive test suites:

**Run all tests:**
```bash
npm test
```

This runs all 4 test suites in sequence:
1. Citation format tests
2. Backend functionality tests  
3. Integration tests
4. Gemini API tests

**Run individual test suites:**

1. **Citation Tests** (`test-citation.js`):
   ```bash
   npm run test:citation
   ```
   Tests citation format conversion for linking to code locations.

2. **Backend Tests** (`test-backend.js`):
   ```bash
   npm run test:backend
   ```
   Tests core backend functionality including directory tree generation.

3. **Integration Tests** (`test-integration.js`):
   ```bash
   npm run test:integration
   ```
   Tests the full API endpoints and request/response handling.

4. **Gemini Tests** (`test-gemini.js`):
   ```bash
   npm run test:gemini
   ```
   Tests Gemini API integration with real API calls (requires `GEMINI_API_KEY`).

### Manual Testing with curl

1. **Health Check:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Upload Test:**
   ```bash
   curl -X POST http://localhost:3001/upload \
     -H "Content-Type: application/json" \
     -d '{
       "files": [
         {
           "filename": "test.js",
           "content": "console.log(\"Hello World\");"
         }
       ],
       "prompt": "What does this code do?"
     }'
   ```

### Testing with VS Code Extension

1. Start the backend server
2. Update the VS Code extension to point to `http://localhost:3001`
3. Use the extension to send files and prompts
4. Check the backend console for detailed logs

## Directory Tree Structure

The backend generates a hierarchical directory tree for all uploaded files:

### Tree Structure
- **Directories**: Represented with `type: "directory"` and `children` object
- **Files**: Represented with `type: "file"` and file metadata

### File Metadata
- **type**: Either "file" or "directory"
- **size**: Character count of file content
- **extension**: File extension (e.g., "tsx", "json", "js")
- **preview**: First 3 non-empty lines of code (trimmed)
- **fullContent**: Complete file content
- **children**: For directories, contains nested structure

### Example Tree Structure
```json
{
  "src": {
    "type": "directory",
    "children": {
      "App.tsx": {
        "type": "file",
        "size": 94,
        "extension": "tsx",
        "preview": ["import React from \"react\";", "export default function App() {", "return <div>Hello World</div>;"],
        "fullContent": "import React from \"react\";\n\nexport default function App() {\n  return <div>Hello World</div>;\n}"
      },
      "utils": {
        "type": "directory",
        "children": {
          "helper.ts": {
            "type": "file",
            "size": 50,
            "extension": "ts",
            "preview": ["export function helper() {", "return true;", "}"],
            "fullContent": "export function helper() {\n  return true;\n}"
          }
        }
      }
    }
  }
}
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3001)
- `GEMINI_API_KEY`: Google Gemini API key for real AI responses (required)
- `NODE_ENV`: Environment mode (development/production)

### CORS Settings

Currently configured to allow all origins for development:
```javascript
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true
}));
```

For production, update to specific origins:
```javascript
app.use(cors({
    origin: ['https://your-domain.com'],
    credentials: true
}));
```

## Deployment

### AWS EC2

1. **Launch EC2 Instance:**
   - Choose Ubuntu 20.04 LTS
   - Configure security group to allow port 3001
   - Launch instance

2. **Setup Server:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Clone and setup application
   git clone <your-repo>
   cd ai-code-assistant-backend
   npm install
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Start application
   pm2 start index.js --name "ai-backend"
   pm2 startup
   pm2 save
   ```

3. **Configure Nginx (optional):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Render

1. **Connect Repository:**
   - Go to Render dashboard
   - Click "New Web Service"
   - Connect your GitHub repository

2. **Configure Service:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js
   - **Port**: 3001

3. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically deploy


## Development

## Troubleshooting

### Common Issues

1. **Port Already in Use:**
   ```bash
   # Find process using port 3001
   lsof -i :3001
   
   # Kill process
   kill -9 <PID>
   ```

2. **CORS Errors:**
   - Ensure CORS is properly configured
   - Check that the VS Code extension is sending requests to the correct URL

3. **Large File Uploads:**
   - Verify the 10MB limit is sufficient
   - Check network timeout settings

### Logs

The server provides detailed console logs for debugging:
- Request details (method, path, timestamp)
- File information (count, names, sizes)
- Response generation
- Error details

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review the console logs for error details
