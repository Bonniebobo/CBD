# Unit Test Specification: `tests/unit/test-llm-unit.js`

**Target File**: `backend/services/llmService.js`

**Test Type**: Pure unit tests - No external dependencies (no API calls, no network)

---

## Functions to Test:

Each function below maps to test IDs in the test table (e.g., Function 1 → Tests 1.1, 1.2, 1.3, etc.)

1. **constructor()** - `new LLMService()` (lines 11-28 in `llmService.js`)
   - Initializes LLMService, handles missing/invalid API keys
   
2. **generateResponse(prompt, files, currentFile)** - Error handling wrapper (lines 37-49)
   - Validates model initialization and wraps API errors (UNIT TEST with mocks)
   
3. **prepareFileContext(files)** - File formatting utility (lines 118-128)
   - Formats file contents as text for LLM prompt
   
4. **generateDirectoryTree(files)** - Tree structure builder (lines 135-176)
   - Creates hierarchical directory structure from file list
   
5. **formatDirectoryTree(tree, indent)** - Tree formatter (lines 184-205)
   - Converts tree object to human-readable text with icons
   
6. **isGeminiAvailable()** - Availability checker (lines 207-209)
   - Returns boolean indicating if Gemini model is initialized
   
7. **getStatus()** - Status reporter (lines 215-221)
   - Returns service configuration status object

8. **generateGeminiResponse(prompt, files, currentFile)** - Gemini API wrapper (lines 58-111)
   - Builds prompts and calls Gemini API (UNIT TEST with mocked geminiModel)

---

## Test Table:

| Test # | Test Purpose | Test Inputs | Expected Output | Notes |
|--------|-------------|-------------|-----------------|-------|
| **1.1** | Constructor handles missing API key gracefully | Environment variable `GEMINI_API_KEY` not set | `geminiApiKey` is null, `geminiModel` is null, no crash | Unit test - no real API |
| **1.2** | Constructor handles empty string API key | Environment variable `GEMINI_API_KEY=""` (empty string) | `geminiApiKey` is falsy, `geminiModel` is null | Empty string is falsy |
| **1.3** | Constructor logs warning when no API key | No API key provided | Console log contains "⚠️  No Gemini API key found" | Check console output |
| **2.1** | generateResponse throws error when model not initialized | LLMService with no API key, call `generateResponse("test", [])` | Throws Error: "Gemini model not initialized. Set GEMINI_API_KEY to enable AI responses." | Model check on line 38-40 |
| **2.2** | generateResponse delegates to generateGeminiResponse | Mock LLMService with `geminiModel`, mock `generateGeminiResponse` to return "result" | Returns "result" from `generateGeminiResponse` | Delegation logic |
| **2.3** | generateResponse wraps errors with descriptive message | Mock `generateGeminiResponse` to throw Error("API failed") | Throws Error: "Gemini API error: API failed" | Error wrapping lines 44-48 |
| **2.4** | generateResponse handles non-Error exceptions | Mock `generateGeminiResponse` to throw "string error" | Throws Error with "Gemini API error: string error" | String() conversion on line 45 |
| **2.5** | generateResponse logs errors to console | Mock `generateGeminiResponse` to throw error | Console.error called with "Gemini API error:" and message | Error logging line 46 |
| **3.1** | prepareFileContext formats single file correctly | `files: [{filename: "test.js", content: "line1\nline2\nline3"}]` | String contains "File: test.js", "line1", "line2", "line3", "---" | Pure function test |
| **3.2** | prepareFileContext handles multiple files | `files: [{filename: "a.js", content: "a"}, {filename: "b.js", content: "b"}]` | String contains "File: a.js", "File: b.js", both separated by "\n\n" | Pure function test |
| **3.3** | prepareFileContext limits preview to first 10 lines | `files: [{filename: "test.js", content: "line1\n...\nline15"}]` (15 lines) | Output contains first 10 lines and "..." indicator | slice(0, 10) on line 122 |
| **3.4** | prepareFileContext handles empty file content | `files: [{filename: "empty.js", content: ""}]` | String contains "File: empty.js" and "---", no crash | Edge case |
| **3.5** | prepareFileContext handles files without content property | `files: [{filename: "test.js"}]` | No crash, treats as empty content | Default `content || ''` |
| **3.6** | prepareFileContext handles empty files array | `files: []` | Returns empty string | Edge case |
| **4.1** | generateDirectoryTree creates flat structure for root-level files | `files: [{filename: "test.js", content: "content"}]` | Tree object has key "test.js" with `type: "file"` | Core functionality |
| **4.2** | generateDirectoryTree creates nested structure for subdirectories | `files: [{filename: "src/app.js", content: "content"}]` | Tree has "src" key with `type: "directory"` and `children` containing "app.js" | Core functionality |
| **4.3** | generateDirectoryTree includes file metadata | `files: [{filename: "test.js", content: "hello"}]` | File object has `size: 5`, `extension: "js"`, `preview`, `fullContent` | Verify all metadata |
| **4.4** | generateDirectoryTree extracts up to 3 trimmed non-empty lines for preview | `files: [{filename: "test.js", content: "line1\n\nline2\n  line3  \nline4"}]` | File preview array has up to 3 items: ["line1", "line2", "line3"] (trimmed, filtered) | slice(0,3).map(trim).filter (lines 152-154) |
| **4.5** | generateDirectoryTree preview may have fewer than 3 items | `files: [{filename: "test.js", content: "\n\nline1\n\n"}]` (only 1 non-empty) | File preview array has 1 item: ["line1"] | Filter removes empty |
| **4.6** | generateDirectoryTree handles multiple levels of nesting | `files: [{filename: "src/components/Button.tsx", content: "code"}]` | Tree has nested structure: src → components → Button.tsx | Deep nesting |
| **4.7** | generateDirectoryTree handles files without filename | `files: [{content: "content"}]` | No crash, skips file (early return on line 139) | Error handling |
| **4.8** | generateDirectoryTree handles empty files array | `files: []` | Returns empty object `{}` | Edge case |
| **4.9** | generateDirectoryTree determines file extension correctly | `files: [{filename: "test.tsx", content: ""}]` | File has `extension: "tsx"` | split('.').pop() |
| **4.10** | generateDirectoryTree handles files with no extension | `files: [{filename: "Makefile", content: ""}]` | File has `extension: "Makefile"` | Last part after split |
| **4.11** | generateDirectoryTree handles multiple files in same directory | `files: [{filename: "a.js"}, {filename: "b.js"}]` | Tree has both "a.js" and "b.js" at root level | Multiple files |
| **5.1** | formatDirectoryTree formats flat file structure | `tree: {"test.js": {type: "file", size: 10, extension: "js", preview: []}}`, `indent: ""` | String contains "📄 test.js (10 chars, .js)" | Basic formatting |
| **5.2** | formatDirectoryTree formats directory structure | `tree: {"src": {type: "directory", children: {}}}`, `indent: ""` | String contains "📁 src/" | Directory icon |
| **5.3** | formatDirectoryTree recursively indents nested items | Tree with src/app.js, `indent: ""` | Output has "📁 src/" followed by indented "  📄 app.js" | Recursive indentation |
| **5.4** | formatDirectoryTree includes file previews | Tree with file having `preview: ["line1", "line2"]` | Output contains preview lines with proper indentation | Preview formatting |
| **5.5** | formatDirectoryTree sorts keys alphabetically | `tree: {"z.js": {...}, "a.js": {...}}` | Output lists "a.js" before "z.js" | Object.keys().sort() on line 187 |
| **5.6** | formatDirectoryTree handles empty tree | `tree: {}`, `indent: ""` | Returns empty string "" | Edge case |
| **5.7** | formatDirectoryTree uses custom indent | Tree with one file, `indent: "  "` | All lines start with "  " | Custom indentation |
| **6.1** | isGeminiAvailable returns false when model is not initialized | LLMService instance with no API key | Returns `false` | !!null = false |
| **6.2** | isGeminiAvailable returns true when model exists | LLMService with mocked geminiModel | Returns `true` | !!object = true |
| **7.1** | getStatus returns complete status object | LLMService instance (no API key) | Returns object with `geminiAvailable`, `geminiApiKey`, `service` properties | Status structure |
| **7.2** | getStatus reports correct geminiAvailable when model doesn't exist | LLMService with no API key | Status object has `geminiAvailable: false` | Calls isGeminiAvailable() |
| **7.3** | getStatus reports correct geminiApiKey when key doesn't exist | LLMService with no API key | Status object has `geminiApiKey: false` | !!this.geminiApiKey |
| **7.4** | getStatus always reports service name | LLMService instance (any state) | Status object has `service: "LLMService"` | String constant |
| **8.1** | generateGeminiResponse successfully generates response | Mock `geminiModel.generateContent()` to return response with text "AI response" | Returns "AI response" string | Mock API, test success path |
| **8.2** | generateGeminiResponse throws error on empty response | Mock `geminiModel.generateContent()` to return empty text | Throws Error: "Empty response from Gemini" | Error handling line 100-102 |
| **8.3** | generateGeminiResponse handles API call failure | Mock `geminiModel.generateContent()` to throw error | Re-throws error and logs to console | Catch block lines 107-109 |
| **8.4** | generateGeminiResponse includes file context in prompt | Files with content, mock API | Prompt passed to API contains file contents | Verify prepareFileContext is used |
| **8.5** | generateGeminiResponse includes directory tree in prompt | Files array, mock API | Prompt contains formatted directory tree | Verify generateDirectoryTree + formatDirectoryTree |
| **8.6** | generateGeminiResponse includes currentFile in prompt | Call with `currentFile="test.js"`, mock API | Prompt contains "Current file being edited: test.js" | Verify currentFile parameter |

---

## Implementation Notes:

### Setup Requirements:
- **No external dependencies needed** (no server, no API key)
- Manipulate `process.env.GEMINI_API_KEY` for constructor tests
- Use `delete process.env.GEMINI_API_KEY` to test missing key scenario

### Test Data:
- Import from `tests/test-data.js` for consistent mock files
- Use simple inline fixtures for edge cases

### Execution:
```bash
# Fast - runs in < 100ms
npm run test:unit
```

### Success Criteria:
- ✅ All tests pass
- ✅ No API calls made
- ✅ No network activity
- ✅ Tests run in under 1 second
- ✅ 100% code coverage for tested functions


## Total Unit Tests: 44

**Note**: Tests 1.4 & 1.5 (constructor error/success with GoogleGenerativeAI) have been **moved to integration tests**:
- See `test_spec_llm-integration.md` tests 1.1-1.2
- Reason: Cannot be unit tested with mocks (would require file-level `jest.mock()`)
- These tests require real API keys and are better suited for integration testing
