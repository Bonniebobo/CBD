# AI Code Assistant Backend

A Node.js + Express backend API for the AI Code Assistant VS Code Extension. This backend receives project files and user prompts from the VS Code extension and provides AI-powered responses.

## Features

- **File Upload Endpoint**: Accepts project files and user prompts via POST `/upload`
- **Directory Tree Generation**: Creates hierarchical tree structure with file previews
- **File Previews**: Shows first 3 lines of code for each file
- **Gemini LLM Integration**: Real AI responses using Google's Gemini API
- **Mock Response Fallback**: Intelligent mock responses when LLM is unavailable
- **CORS Support**: Configured for VS Code extension communication
- **Request Logging**: Detailed console logging for debugging
- **Large File Support**: Handles up to 10MB uploads
- **Concurrent Users**: Supports up to 10 simultaneous users
- **Health Check**: `/health` endpoint for monitoring

## Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- (Optional) Gemini API key for real AI responses

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up Gemini API key:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your Gemini API key
   # Get your free API key from: https://makersuite.google.com/app/apikey
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Test the backend:
   ```bash
   npm test
   ```

5. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

### Quick Deployment

Run the deployment helper script:
```bash
./deploy.sh
```

This will check your environment, install dependencies, run tests, and provide deployment instructions.

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
  "message": "Successfully received 2 files. Prompt was: 'Summarize this repository'",
  "mockResponse": "LLM would say: 'Based on your 2 files, this appears to be a React-based application...'",
  "directoryTree": {
    "src": {
      "type": "directory",
      "children": {
        "App.tsx": {
          "type": "file",
          "size": 94,
          "extension": "tsx",
          "preview": ["import React from \"react\";", "export default function App() {"],
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
  "metadata": {
    "filesProcessed": 2,
    "totalCharacters": 156,
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
- **size**: Character count of file content
- **extension**: File extension (e.g., "tsx", "json", "js")
- **preview**: First 3 non-empty lines of code
- **fullContent**: Complete file content

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
        "preview": ["import React from \"react\";", "export default function App() {"],
        "fullContent": "import React from \"react\";\n\nexport default function App() {\n  return <div>Hello World</div>;\n}"
      }
    }
  }
}
```

## Mock LLM Response Types

The backend generates intelligent mock responses based on:

- **Repository Summary**: When prompt contains "summary", "repository", or "repo" (includes directory tree)
- **Code Explanation**: When prompt contains "explain", "what", or "how"
- **Code Generation**: When prompt contains "generate", "create", or "new"
- **Debugging Help**: When prompt contains "debug", "error", or "fix"
- **Refactoring**: When prompt contains "refactor", "improve", or "optimize"
- **General Response**: For other prompts

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3001)
- `GEMINI_API_KEY`: Google Gemini API key for real AI responses (optional)
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

### Heroku

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App:**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

## Development

### Project Structure

```
backend/
├── index.js          # Main server file
├── package.json      # Dependencies and scripts
├── README.md         # This file
└── node_modules/     # Dependencies (after npm install)
```

### Gemini LLM Integration

The backend now includes real Gemini LLM integration! Here's how it works:

### Setup

1. **Get a Gemini API Key** (free):
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Copy the API key

2. **Configure the Backend**:
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Add your API key to .env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Restart the Backend**:
   ```bash
   npm start
   ```

### How It Works

- **With API Key**: Uses real Gemini AI responses
- **Without API Key**: Falls back to intelligent mock responses
- **Automatic Fallback**: If Gemini fails, uses mock responses
- **Status Monitoring**: Check `/health` endpoint for LLM status

### Response Format

The response includes LLM status information:

```json
{
  "message": "Successfully received 2 files. Prompt was: 'Summarize this repository'",
  "mockResponse": "Real Gemini AI response here...",
  "directoryTree": { ... },
  "llmStatus": {
    "geminiAvailable": true,
    "geminiApiKey": true,
    "service": "LLMService"
  },
  "metadata": { ... }
}
```

### Health Check

Check if Gemini is available:

```bash
curl http://localhost:3001/health
```

Response includes LLM status:
```json
{
  "status": "healthy",
  "llmStatus": {
    "geminiAvailable": true,
    "geminiApiKey": true,
    "service": "LLMService"
  }
}
```

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
