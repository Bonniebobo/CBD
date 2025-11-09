# Integration Test Specification: `tests/integration/test-api-integration.js`

**Target**: Full HTTP API with real Express server

**Test Type**: Integration tests - Requires running server on port 3001

---

## Endpoints to Test:

Each endpoint/feature below maps to test IDs in the test table (e.g., Endpoint 1 → Tests 1.1, 1.2, 1.3, etc.)

1. **GET /health** - `app.get('/health', ...)` (lines 31-38 in `index.js`)
   - Health check endpoint returning server status, uptime, LLM status
   
2. **POST /upload** - `app.post('/upload', ...)` (lines 41-101)
   - Main endpoint for file upload and AI processing
   
3. **Upload Validation** - Validation logic in upload handler (lines 46-56)
   - Tests 400 Bad Request scenarios for invalid inputs
   
4. **Upload Processing** - Full upload flow (lines 59-92)
   - Tests successful upload, response structure, metadata
   
5. **404 Handler** - `app.use('*', ...)` (lines 113-118)
   - Tests non-existent endpoints
   
6. **CORS Middleware** - Cross-origin request handling (lines 15-18)
   - Tests CORS headers and preflight requests
   
7. **Request Logging** - Logging middleware (lines 25-28)
   - Tests that requests are logged with proper format
   
8. **Error Scenarios** - Various error conditions
   - Malformed JSON, payload size limits, API errors
   
9. **Concurrency & Load** - Multiple simultaneous requests
   - Tests server capacity (10 concurrent users claim)

---

## Test Table:

| Test # | Test Purpose | Test Inputs | Expected Output | Prerequisites |
|--------|-------------|-------------|-----------------|---------------|
| **1.1** | Health check returns 200 status | HTTP GET to `/health` | HTTP status 200 | Server running |
| **1.2** | Health check returns healthy status | HTTP GET to `/health` | JSON with `status: "healthy"` | Server running |
| **1.3** | Health check includes uptime | HTTP GET to `/health` | JSON with `uptime` (number > 0) | Server running |
| **1.4** | Health check includes timestamp | HTTP GET to `/health` | JSON with ISO 8601 timestamp string | Server running |
| **1.5** | Health check includes LLM status object | HTTP GET to `/health` | JSON with `llmStatus` object | Server running |
| **1.6** | Health check LLM status reflects API key present | HTTP GET to `/health` with API key configured | `llmStatus.geminiAvailable: true`, `geminiApiKey: true` | API key set |
| **1.7** | Health check LLM status reflects no API key | HTTP GET to `/health` with no API key | `llmStatus.geminiAvailable: false`, `geminiApiKey: false` | No API key |
| **2.1** | Upload endpoint accepts POST with valid data | POST with `{ files: [{...}], prompt: "test" }` | HTTP status 200 | Server + API key |
| **2.2** | Upload endpoint returns JSON content-type | POST to `/upload` | Response header `Content-Type: application/json` | Server + API key |
| **3.1** | Upload validation rejects missing files | POST to `/upload` with `{ prompt: "test" }` | HTTP status 400, error: "files must be an array" | Server running |
| **3.2** | Upload validation rejects non-array files | POST to `/upload` with `{ files: "string", prompt: "test" }` | HTTP status 400, error: "files must be an array" | Server running |
| **3.3** | Upload validation rejects missing prompt | POST to `/upload` with `{ files: [] }` | HTTP status 400, error: "prompt must be a string" | Server running |
| **3.4** | Upload validation rejects non-string prompt | POST to `/upload` with `{ files: [], prompt: 123 }` | HTTP status 400, error: "prompt must be a string" | Server running |
| **3.5** | Upload validation accepts empty files array | POST with `{ files: [], prompt: "test" }` | HTTP status 200 (validation passes, calls LLM) | Server + API key |
| **4.1** | Upload returns complete response structure | POST with valid files and prompt | Response has `message`, `aiResponse`, `directoryTree`, `llmStatus`, `metadata` | Server + API key |
| **4.2** | Upload returns aiResponse from LLM | POST with valid input | Response includes `aiResponse` string from Gemini | Server + API key |
| **4.3** | Upload returns directoryTree | POST with files | Response includes `directoryTree` object with nested structure | Server + API key |
| **4.4** | Upload returns llmStatus | POST with valid input | Response includes `llmStatus` object from LLMService | Server + API key |
| **4.5** | Upload returns metadata with filesProcessed | POST with 3 files | `metadata.filesProcessed: 3` | Server + API key |
| **4.6** | Upload returns metadata with totalCharacters | POST with files totaling 500 chars | `metadata.totalCharacters: 500` | Server + API key |
| **4.7** | Upload returns metadata with ISO timestamp | POST with valid input | `metadata.timestamp` is ISO 8601 string | Server + API key |
| **4.8** | Upload returns success message with file count | POST with 2 files | `message: "Successfully processed 2 files."` | Server + API key |
| **4.9** | Upload processes large files within 10MB limit | POST with 8MB total file content | Returns 200, processes successfully | Server + API key |
| **4.10** | Upload logs request details with header | POST to `/upload` | Console shows "=== NEW UPLOAD REQUEST ===" | Server running |
| **4.11** | Upload logs prompt text | POST with prompt "analyze code" | Console shows 'Prompt: "analyze code"' | Server running |
| **4.12** | Upload logs file count | POST with 3 files | Console shows "Files received: 3" | Server running |
| **4.13** | Upload logs individual file details | POST with file "test.js" 100 chars | Console shows filename, size, type | Server running |
| **4.14** | Upload logs completion message | Successful POST | Console shows "Response generated successfully" and "=== END REQUEST ===" | Server running |
| **4.15** | Upload directoryTree structure is correct | POST with files "src/app.js", "package.json" | `directoryTree` has "src" dir with "app.js" child, and "package.json" at root | Server + API key |
| **5.1** | 404 handler returns 404 status for GET | HTTP GET to `/nonexistent` | HTTP status 404 | Server running |
| **5.2** | 404 handler returns 404 status for POST | HTTP POST to `/invalid` | HTTP status 404 | Server running |
| **5.3** | 404 handler includes error field | HTTP GET to `/test` | Response includes `error: "Endpoint not found"` | Server running |
| **5.4** | 404 handler includes method and path in message | HTTP GET to `/test/path` | Message: "The endpoint GET /test/path does not exist" | Server running |
| **6.1** | CORS allows requests with Origin header | HTTP request with `Origin: http://localhost:3000` | Response includes `Access-Control-Allow-Origin` header | Server running |
| **6.2** | CORS allows credentials | HTTP request with credentials | Response includes `Access-Control-Allow-Credentials: true` | Server running |
| **6.3** | CORS handles preflight OPTIONS request | OPTIONS to `/upload` with CORS headers | Returns 204/200 with CORS headers | Server running |
| **6.4** | CORS allows all origins | Request from any origin | `Access-Control-Allow-Origin` reflects request origin | Server running |
| **7.1** | Request logging logs GET requests | HTTP GET to `/health` | Console log: "[ISO_TIMESTAMP] GET /health" | Server running |
| **7.2** | Request logging logs POST requests | HTTP POST to `/upload` | Console log: "[ISO_TIMESTAMP] POST /upload" | Server running |
| **7.3** | Request logging includes ISO timestamp | Any HTTP request | Console log has timestamp in format `[YYYY-MM-DDTHH:mm:ss.sssZ]` | Server running |
| **7.4** | Request logging logs all requests | Multiple requests to different endpoints | Each request appears in console log | Server running |
| **8.1** | Server handles malformed JSON | POST with invalid JSON body (e.g., `{broken`) | Returns 400 Bad Request with JSON parse error | Server running |
| **8.2** | Server rejects payload exceeding 10MB limit | POST with 11MB JSON body | Returns 413 Payload Too Large | Server running |
| **8.3** | Server handles LLM API errors gracefully | POST with valid data but LLM throws error | Returns 500 with `error: "Internal server error"` and `message` field | Server + invalid API key |
| **8.4** | Server error response includes error message | Trigger any server error | Response has `error` and `message` fields | Server running |
| **8.5** | Server logs errors to console | Trigger upload error | Console.error called with error details | Server running |
| **9.1** | Server handles 10 concurrent requests | 10 simultaneous POST requests to /upload | All 10 requests complete successfully (200 status) | Server + API key |
| **9.2** | Server handles concurrent requests without data corruption | 5 requests with different data | Each response matches its request (filesProcessed count correct) | Server + API key |
| **9.3** | Server maintains performance under load | 10 concurrent requests | Average response time < 15 seconds | Server + API key |

---

## Pre-Test Setup:

### Required Actions Before Tests:
```bash
# 1. Set environment variables
export GEMINI_API_KEY=your_key_here

# 2. Start the server
npm start

# 3. Wait for server to be ready
# Poll health endpoint until it returns 200

# 4. Run integration tests
npm run test:integration
```

### CI/CD Setup (Already Configured):
```yaml
- name: Start server
  run: npm start &
  
- name: Wait for health check
  run: |
    for i in {1..20}; do
      if curl --silent --fail http://127.0.0.1:3001/health; then
        break
      fi
      sleep 1
    done

- name: Run integration tests
  run: npm run test:integration
```

---

## Implementation Notes:

### Test Execution:
- **Requires**: Real Express server running on port 3001
- **Network**: Makes actual HTTP requests via `http` module
- **Duration**: ~10-30 seconds (depending on number of tests)

### Test Data:
- Import mock files from `tests/test-data.js`
- Use various prompt strings from `tests/test-data.js`

### Helper Functions:
```javascript
// Check if backend is healthy
async function checkBackendHealth() {
    // Poll http://localhost:3001/health
}

// Make HTTP request
async function makeRequest(method, path, body) {
    // Use Node.js http module
}
```

### Cleanup:
- Tests do not stop the server
- Server cleanup handled by CI or manual termination

## Success Criteria:
- ✅ All tests pass with real server
- ✅ Health check confirms server readiness
- ✅ Valid requests return expected responses
- ✅ Invalid requests return appropriate errors
- ✅ CORS and content-type handling works
- ✅ Tests run reliably in CI

## Total Integration Tests: 47

**Execution Time**: ~30-60 seconds  
**Dependencies**: Running server on port 3001, optional API key for upload tests