# Integration Test Specification: `tests/integration/test-llm-integration.js`

**Target File**: `backend/services/llmService.js`

**Test Type**: Integration tests - Calls real Gemini API

---

## Functions to Test with Real API:

Each function below maps to test IDs in the test table (e.g., Function 1 → Tests 1.1, 1.2, 1.3, etc.)

1. **constructor()** - `new LLMService()` with real API key (lines 11-28 in `llmService.js`)
   - Tests constructor initialization with real GoogleGenerativeAI API
   
2. **generateResponse(prompt, files, currentFile)** - `async generateResponse(...)` (lines 37-49)
   - High-level wrapper that makes real API calls through Gemini
   
3. **generateGeminiResponse(prompt, files, currentFile)** - `async generateGeminiResponse(...)` (lines 58-111)
   - Full integration with Gemini 2.5 Flash API, including prompt construction
   
4. **API Error Handling** - Real error scenarios (rate limits, invalid keys, network issues)
   - Tests error propagation and logging
   
5. **Context Usage Verification** - Verify that file context is used by AI
   - Tests that directory tree and file contents influence responses

**Note**: Constructor error/success paths (tests 1.1-1.2) require real API keys and cannot be unit tested with mocks.

---

## Test Table:

| Test # | Test Purpose | Test Inputs | Expected Output | Prerequisites |
|--------|-------------|-------------|-----------------|---------------|
| **1.1** | Constructor initializes successfully with valid API key | Environment variable `GEMINI_API_KEY` set to valid key | `geminiModel` is initialized, console shows "✅ Gemini LLM initialized successfully" | Valid API key |
| **1.2** | Constructor catches and logs GoogleGenerativeAI initialization errors | Set `GEMINI_API_KEY` to invalid/malformed key that causes initialization to fail | Sets `geminiApiKey` to null, logs error with "❌ Failed to initialize Gemini LLM:" | Invalid API key format |
| **2.1** | generateResponse returns non-empty string | `prompt: "Hello"`, `files: []`, valid API key | Returns string with length > 0 | Valid API key |
| **2.2** | generateResponse handles simple code explanation prompt | `prompt: "Explain this code"`, `files: [{filename: "test.js", content: "console.log('hi')"}]` | Returns string explaining the code | Valid API key |
| **2.3** | generateResponse handles repository summarization | `prompt: "Summarize this repository"`, multiple files | Returns coherent summary mentioning key files | Valid API key |
| **2.4** | generateResponse handles empty files array | `prompt: "Hello"`, `files: []` | Returns response without crashing | Valid API key |
| **2.5** | generateResponse handles large codebase (multiple files) | `prompt: "Analyze"`, 10 files with realistic content | Returns comprehensive analysis | Valid API key |
| **2.6** | generateResponse handles long file content | `prompt: "Explain"`, file with 1000+ lines | Returns analysis without truncation errors | Valid API key |
| **2.7** | generateResponse execution time is reasonable | Valid prompt and files | Completes in < 10 seconds | Valid API key |
| **2.8** | generateResponse handles special characters in filenames | `files: [{filename: "test-file_v2.tsx", content: "..."}]` | Processes without errors | Valid API key |
| **2.9** | generateResponse handles code with syntax errors | `files: [{filename: "broken.js", content: "const x = "}]` | Still provides analysis/feedback | Valid API key |
| **3.1** | generateGeminiResponse constructs system prompt with directory tree | Valid inputs with files | System prompt includes formatted directory tree from `formatDirectoryTree()` | Valid API key - inspect logs |
| **3.2** | generateGeminiResponse constructs system prompt with file context | Valid inputs with files | System prompt includes file previews from `prepareFileContext()` | Valid API key - inspect logs |
| **3.3** | generateGeminiResponse includes citation instructions in prompt | Valid inputs | System prompt mentions "Use Markdown links formatted as [label](relative/path:line)" | Valid API key - inspect logs |
| **3.4** | generateGeminiResponse includes currentFile in system prompt | `currentFile: "index.js"` provided | System prompt contains "Current file being edited: index.js" | Valid API key - inspect logs |
| **3.5** | generateGeminiResponse handles missing currentFile | `currentFile: null` | System prompt contains "Current file being edited: None specified" | Valid API key |
| **3.6** | generateGeminiResponse logs success message | Valid API call | Console log contains "✅ Gemini response generated successfully" | Valid API key |
| **4.1** | API error handling: Invalid API key | LLMService with invalid/expired key, call generateResponse | Throws error with "Gemini API error:" prefix, logs to console | Invalid API key |
| **4.2** | API error handling: Rate limiting | Make multiple rapid requests (>10 per minute) | Throws error gracefully, error message includes rate limit info | Valid API key + rapid requests |
| **4.3** | API error handling: Network timeout | Disconnect network during API call (if testable) | Throws error with timeout/network context | Network issues |
| **4.4** | API error handling: Error logged to console | Trigger any API error | Console.error called with "Gemini API call failed:" | Valid/Invalid API key |
| **5.1** | Context usage: Files mentioned in response | Files with "App.tsx", "package.json"; Prompt: "What files are in this codebase?" | Response mentions "App.tsx" and "package.json" | Valid API key |
| **5.2** | Context usage: CurrentFile parameter influences response | `prompt: "What does this file do?"`, `files: [index.js, utils.js]`, `currentFile: "index.js"` | Response focuses more on index.js than utils.js | Valid API key - may be non-deterministic |
| **5.3** | Context usage: Directory structure reflected in response | Files in nested dirs; Prompt: "What's the project structure?" | Response mentions directory hierarchy | Valid API key |
| **5.4** | Context usage: File content used in analysis | File with specific function "calculateTotal"; Prompt: "What does calculateTotal do?" | Response references calculateTotal function | Valid API key |

---

## Pre-Test Setup:

### Required Environment:
```bash
# Set valid Gemini API key
export GEMINI_API_KEY=your_real_api_key_here

# Or in .env file
echo "GEMINI_API_KEY=your_real_api_key_here" > .env
```

### API Key Acquisition:
1. Visit https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Create new API key
4. Copy key to environment variable

### Cost Considerations:
- Gemini API has free tier with rate limits
- Each test makes 1+ API calls
- Monitor API usage during test development

---

## Implementation Notes:

### Test Execution:
- **Requires**: Valid `GEMINI_API_KEY` in environment
- **Network**: Makes real API calls to Google servers
- **Duration**: ~30-60 seconds (depending on API response time)
- **Cost**: Free tier sufficient for testing, but monitor usage

### Test Strategy:
1. **Setup**: Verify API key is present before running tests
2. **Skip gracefully**: If no API key, skip tests with informative message
3. **Rate limiting**: Add delays between tests if needed
4. **Timeouts**: Set reasonable timeouts (10-15 seconds per test)

### Test Data:
- Use realistic code samples from `tests/test-data.js`
- Test with various file types (JS, TS, JSON, etc.)
- Test with different prompt styles (questions, commands, requests)

### Error Handling:
```javascript
async function runIntegrationTests() {
    if (!process.env.GEMINI_API_KEY) {
        console.log('⚠️  Skipping Gemini integration tests (no API key)');
        console.log('   Set GEMINI_API_KEY to run these tests');
        return;
    }
    
    // Run tests...
}
```

### CI/CD Considerations:
```yaml
# Only run if API key secret is configured
- name: Integration Tests (Gemini)
  if: env.GEMINI_API_KEY != ''
  run: npm run test:llm-integration
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

---

## Success Criteria:
- ✅ All tests pass with valid API key
- ✅ Tests skip gracefully without API key
- ✅ API responses are relevant and helpful
- ✅ Error handling works for API failures
- ✅ No API rate limit violations
- ✅ Tests complete within reasonable time

## Total Integration Tests: 26

**Execution Time**: ~25-45 seconds  
**Dependencies**: Valid GEMINI_API_KEY, internet connection  
**Cost**: Free tier (monitor usage)

### Tests Reorganized:
- ✅ **ADDED** constructor tests (1.1-1.2) - moved from unit tests (require real API, can't be mocked)
- ✅ All other tests renumbered: generateResponse (2.x), generateGeminiResponse (3.x), errors (4.x), context (5.x)

## Notes:

### When to Run:
- ⚠️ **NOT on every commit** (costs API calls, slow)
- ✅ **Nightly builds** or before releases
- ✅ **Manual testing** when changing LLM integration
- ✅ **PR reviews** for LLM-related changes

### Alternatives:
For faster feedback, use unit tests with mocked API responses for most development work. Reserve these integration tests for:
- Verifying actual API behavior and connectivity
- Testing prompt construction and context passing
- Validating error handling with real API
- Pre-deployment checks

