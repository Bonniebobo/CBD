# Unit Test Specification: `tests/unit/test-index-unit.js`

**Target File**: `backend/index.js`

**Test Type**: Pure unit tests - Mock Express app and LLMService

---

## Functions to Test:

Each function below maps to test IDs in the test table (e.g., Function 1 → Tests 1.1, 1.2, 1.3, etc.)

1. **Request Logging Middleware** - `app.use((req, res, next) => {...})` (lines 25-28 in `index.js`)
   - Logs incoming HTTP requests with timestamp, method, and path
   
2. **Health Check Handler** - `app.get('/health', ...)` (lines 31-38)
   - Returns server status, uptime, and LLM service status
   
3. **Upload Validation Logic** - Validation in `app.post('/upload', ...)` (lines 46-56)
   - Validates request body has files array and prompt string
   
4. **Response Preparation Logic** - Response construction (lines 77-87)
   - Builds response object with AI response, directory tree, metadata
   
5. **Upload Request Logging** - File logging in upload handler (lines 59-68)
   - Logs detailed information about uploaded files
   
6. **Error Handling Middleware** - `app.use((error, req, res, _next) => {...})` (lines 104-110)
   - Catches and formats unhandled errors
   
7. **404 Handler** - `app.use('*', ...)` (lines 113-118)
   - Handles requests to non-existent endpoints

**Note**: CORS middleware, body size limits, and graceful shutdown handlers are tested in **integration tests** (see `test_spec_api-integration.md` tests 6.x and 8.2) because they require a real HTTP server.

---

## Test Table:

| Test # | Test Purpose | Test Inputs | Expected Output | Notes |
|--------|-------------|-------------|-----------------|-------|
| **1.1** | Request logging middleware extracts method correctly | Mock request with `method: "GET"`, `path: "/health"` | Console log contains "GET" | Mock req object |
| **1.2** | Request logging middleware extracts path correctly | Mock request with `method: "POST"`, `path: "/upload"` | Console log contains "/upload" | Mock req object |
| **1.3** | Request logging middleware includes timestamp | Mock request with any method/path | Console log includes ISO timestamp format | Verify timestamp |
| **1.4** | Request logging middleware calls next() | Mock request, mock next function | `next()` is called exactly once | Spy on next() |
| **2.1** | Health check handler returns correct status object | Mock llmService with `getStatus()` returning mock status | Response has `status: "healthy"`, `timestamp`, `uptime`, `llmStatus` | Mock llmService |
| **2.2** | Health check handler includes uptime from process | Mock `process.uptime()` returning 100 | Response has `uptime: 100` | Verify process.uptime() is called |
| **2.3** | Health check handler includes LLM status | Mock llmService returns `{geminiAvailable: true}` | Response includes `llmStatus.geminiAvailable: true` | Mock dependency |
| **2.4** | Health check handler includes ISO timestamp | Any mock llmService | Response has `timestamp` in ISO 8601 format | Verify new Date().toISOString() |
| **3.1** | Validation rejects missing files | Request body: `{ prompt: "test" }` | Returns 400 with error: "files must be an array" | Validation logic |
| **3.2** | Validation rejects non-array files | Request body: `{ files: "not-array", prompt: "test" }` | Returns 400 with error: "files must be an array" | Type checking |
| **3.3** | Validation rejects missing prompt | Request body: `{ files: [] }` | Returns 400 with error: "prompt must be a string" | Validation logic |
| **3.4** | Validation rejects non-string prompt | Request body: `{ files: [], prompt: 123 }` | Returns 400 with error: "prompt must be a string" | Type checking |
| **3.5** | Validation accepts valid input | Request body: `{ files: [{filename: "test.js", content: "code"}], prompt: "test" }` | Validation passes, proceeds to processing | Happy path - Mock LLM |
| **3.6** | Validation accepts empty files array | Request body: `{ files: [], prompt: "test" }` | Validation passes (files is array, prompt is string) | Edge case - Mock LLM |
| **4.1** | Response includes message field | Mock successful processing of 2 files | Response has `message: "Successfully processed 2 files."` | Response structure |
| **4.2** | Response includes aiResponse from LLM | Mock LLM returns "AI response text" | Response has `aiResponse: "AI response text"` | Mock LLM |
| **4.3** | Response includes directoryTree | Mock LLM.generateDirectoryTree returns tree object | Response has `directoryTree` with tree structure | Mock LLM |
| **4.4** | Response includes llmStatus | Mock LLM.getStatus() returns status | Response has `llmStatus` object | Mock LLM |
| **4.5** | Response metadata has correct filesProcessed | Input: 3 files | Response metadata: `filesProcessed: 3` | Count files |
| **4.6** | Response metadata calculates totalCharacters | Input: files with 50, 100, 150 chars | Response metadata: `totalCharacters: 300` | Sum calculation |
| **4.7** | Response metadata includes timestamp | Any input | Response metadata has ISO timestamp | Timestamp generation |
| **4.8** | Response metadata handles files without content | Input: file without content property | Treats as 0 characters, no crash | Error handling |
| **5.1** | Upload logging shows NEW UPLOAD REQUEST header | Mock upload with prompt and files | Console log contains "=== NEW UPLOAD REQUEST ===" | Verify logging |
| **5.2** | Upload logging shows prompt | Mock upload with prompt "test prompt" | Console log contains 'Prompt: "test prompt"' | Verify prompt logging |
| **5.3** | Upload logging shows file count | Mock upload with 3 files | Console log contains "Files received: 3" | Verify file count |
| **5.4** | Upload logging shows individual file details | Mock file with filename "test.js", 100 chars | Console log shows filename, size, and type | Verify file iteration |
| **5.5** | Upload logging shows completion message | Mock successful upload | Console log contains "Response generated successfully" and "=== END REQUEST ===" | Verify completion |
| **6.1** | Error handler returns 500 status | Mock error object | Response status: 500 | Status code |
| **6.2** | Error handler includes error message | Mock error with message "Test error" | Response includes `message: "Test error"` | Error propagation |
| **6.3** | Error handler includes error type | Any mock error | Response includes `error: "Internal server error"` | Error classification |
| **6.4** | Error handler logs to console | Mock error | Console.error is called with error | Logging |
| **6.5** | Global error handler triggered by middleware error (not from /upload) | Mock middleware that throws error | Response status: 500, error logged with "Unhandled error:" | Lines 105-106 coverage |
| **7.1** | 404 handler returns 404 status | Mock request to non-existent path | Response status: 404 | Status code |
| **7.2** | 404 handler includes endpoint in message | Mock request: `GET /nonexistent` | Error message contains "GET /nonexistent" | Message format |
| **7.3** | 404 handler includes error field | Any mock 404 request | Response includes `error: "Endpoint not found"` | Error field |

---

## Mocking Strategy:

### Mock Express Request:
```javascript
const mockReq = {
    method: 'POST',
    path: '/upload',
    body: { files: [], prompt: 'test' }
};
```

### Mock Express Response:
```javascript
const mockRes = {
    json: (data) => { /* store data */ },
    status: (code) => ({ json: (data) => { /* store code & data */ } })
};
```

### Mock LLMService:
```javascript
const mockLLMService = {
    generateResponse: async () => 'Mock AI response',
    generateDirectoryTree: () => ({ 'test.js': {...} }),
    getStatus: () => ({ geminiAvailable: true, geminiApiKey: true })
};
```

### Mock Next Function:
```javascript
const mockNext = () => { /* track if called */ };
```

---

## Implementation Notes:

### Setup Requirements:
- **Mock all Express dependencies** (req, res, next)
- **Mock LLMService** to avoid API calls
- **Stub console methods** to verify logging
- **No server startup required**

### Test Approach:
1. Import handler functions from `index.js`
2. Call handlers with mock req/res objects
3. Assert on response data and side effects

### Execution:
```bash
# Fast - runs in < 100ms
npm run test:unit
```

### Success Criteria:
- ✅ All tests pass
- ✅ No HTTP server started
- ✅ No real API calls
- ✅ Tests run independently
- ✅ High code coverage for validation logic


## Total Unit Tests: 35