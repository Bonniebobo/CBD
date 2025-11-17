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
    # Run unit tests (no server required)
    npm test
    
    # Run API tests (requires server running in another terminal)
    npm run test:api
    
    # Run all tests
    npm run test:all
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

## Current Cloud Deployment (team reference)
- Invoke URL (API Gateway): https://4xwuxxqbqj.execute-api.us-east-1.amazonaws.com
- Routes: `GET /health`, `POST /upload`
- Lambda runtime: Node.js 22.x, handler `lambda.handler`, timeout 20s, memory 256MB
- Env vars on Lambda: `GEMINI_API_KEY` (required), `NODE_ENV=production` (optional)
- Packaging: `npm run lambda:package` (Node 22, prod deps only)
- When swapping frontend/extension to cloud, set base URL to the Invoke URL above; keep `http://localhost:3001` for local dev.

## Deploying to AWS Lambda + API Gateway

Use Lambda for the backend so API Gateway can expose `/upload` and `/health` without running a server VM.

### Prerequisites
- AWS CLI configured with an IAM role that has `AWSLambdaBasicExecutionRole` and permission for API Gateway to invoke the function.
- Node.js 18+ locally for packaging.
- Set your `GEMINI_API_KEY` as a Lambda environment variable.

### Package the function
```bash
# From the backend folder
npm install       # ensures serverless-http is present
npm run lambda:package  # produces lambda.zip with code + dependencies
```

### Create/Update the Lambda
```bash
# First-time create
aws lambda create-function \
  --function-name ai-code-assistant-backend \
  --runtime nodejs18.x \
  --role arn:aws:iam::<ACCOUNT_ID>:role/<LAMBDA_EXEC_ROLE> \
  --handler lambda.handler \
  --zip-file fileb://lambda.zip \
  --environment Variables="{GEMINI_API_KEY=$GEMINI_API_KEY,NODE_ENV=production}"

# Subsequent deploys
aws lambda update-function-code \
  --function-name ai-code-assistant-backend \
  --zip-file fileb://lambda.zip
```

### Wire API Gateway (HTTP API)
```bash
# Create an HTTP API that proxies all routes to the Lambda
API_ID=$(aws apigatewayv2 create-api \
  --name ai-code-assistant-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:$AWS_REGION:<ACCOUNT_ID>:function:ai-code-assistant-backend \
  --query 'ApiId' --output text)

# Allow API Gateway to invoke the Lambda
aws lambda add-permission \
  --function-name ai-code-assistant-backend \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn arn:aws:execute-api:$AWS_REGION:<ACCOUNT_ID>:$API_ID/*/*/*
```

API Gateway creates a default stage; the invoke URL will look like `https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/`. The Express routes stay the same, so `/upload` and `/health` are available immediately.

### Smoke test
```bash
API_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com"
curl -X GET "$API_URL/health"
curl -X POST "$API_URL/upload" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"filename":"README.md","content":"hello"}],"prompt":"summarize"}'
```

### Tips
- Keep the Lambda zipped size under the 50MB direct upload limit; prune devDependencies before packaging if needed.
- When running the VS Code extension locally, keep using `http://localhost:3001`. For the deployed build, swap the base URL with the API Gateway invoke URL.

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

**Quick test (no server required):**
```bash
npm test
```

Runs LLM service tests including directory tree generation, citations, and Gemini integration (if API key is configured).

**Full test suite:**
```bash
# Terminal 1: Start the server
npm start

# Terminal 2: Run all tests
npm run test:all
```

**Individual test suites:**

1. **LLM Service Tests** (`test-llm.js`) - No server required:
   ```bash
   npm test
   # or
   npm run test:llm
   ```
   Tests the LLMService class including:
   - Service status and configuration
   - Directory tree generation
   - Citation generation in AI responses
   - Multiple prompt handling
   - Error handling
   - Gemini API integration (if API key is configured)

2. **API Integration Tests** (`test-api.js`) - Requires server:
   ```bash
   npm run test:api
   ```
   Tests the HTTP API endpoints including:
   - Health check endpoint
   - Upload endpoint with various prompts
   - Request validation and error handling
   - 404 handling
   - VS Code extension integration simulation
   
   **⚠️ Important:** Start the backend server first with `npm start` in another terminal.

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

### Project Structure

```
backend/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── README.md             # This file
├── deploy.sh             # Deployment helper script
├── services/
│   └── llmService.js     # LLM service for Gemini integration
├── tests/
│   ├── test-data.js      # Shared mock data for tests
│   ├── test-llm.js       # LLM service tests
│   └── test-api.js       # API integration tests
└── node_modules/         # Dependencies (after npm install)
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
