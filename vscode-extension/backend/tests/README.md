# Backend Tests

## Quick Start

```bash
# Install dependencies (including Jest)
npm install

# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run API integration tests (requires server)
npm start &
npm run test:integration

# Run LLM integration tests (requires API key)
npm run test:llm-integration

# Run all tests (unit + integration)
npm run test:all
```

## Test Structure

```
tests/
├── unit/                              # Jest unit tests (fast, no dependencies)
│   ├── llmService.test.js            # 48 tests for LLMService
│   ├── handlers.test.js              # 29 tests for Express handlers
│   ├── test_spec_llm-unit.md         # LLM unit test specification
│   └── test_spec_index-unit.md       # Handlers unit test specification
│
├── integration/                       # Jest integration tests (slow, real dependencies)
│   ├── api-integration.test.js       # 30+ HTTP API tests (requires server)
│   ├── llm-integration.test.js       # 20+ Gemini API tests (requires API key)
│   ├── test_spec_api-integration.md  # API integration test specification
│   └── test_spec_llm-integration.md  # LLM integration test specification
│
├── test-data.js                       # Shared test fixtures and mock data
└── TEST_PLAN.md                       # Complete testing strategy
```

## Unit Tests (Jest)

**Framework**: Jest  
**Total Tests**: 79
**Execution Time**: < 1 second  
**Dependencies**: None (mocked)

### What's Tested:
- ✅ LLMService pure functions (directory tree, file context, formatting)
- ✅ Express handler logic (validation, response preparation, error handling)
- ✅ Constructor initialization
- ✅ Status reporting

### Running:
```bash
# Run all unit tests
npm test

# Run with coverage report
npm test -- --coverage

# Run in watch mode (re-runs on file change)
npm run test:watch

# Run specific test file
npm test llmService.test.js

# Run specific test suite
npm test -- --testNamePattern="generateDirectoryTree"
```

## Integration Tests (Jest)

**Framework**: Jest + Supertest  
**Total Tests**: 50+  
**Execution Time**: ~30-90 seconds  
**Dependencies**: Real server (API tests) + API key (LLM tests)

### API Integration Tests:
- ✅ HTTP endpoints (health, upload, 404)
- ✅ Request validation and error handling
- ✅ CORS and middleware
- ✅ Concurrency testing
- ✅ **No API key required** (for CI)

### LLM Integration Tests:
- ✅ Real Gemini API calls
- ✅ Response generation and quality
- ✅ Context usage verification
- ✅ Error handling with real API
- ⚠️ **Requires GEMINI_API_KEY** (not for CI)

### Running:
```bash
# Run API integration tests (no API key needed, CI-friendly)
# Terminal 1: Start server
npm start

# Terminal 2: Run API tests
npm run test:integration

# Run LLM integration tests (requires API key)
export GEMINI_API_KEY=your_key_here
npm run test:llm-integration

# Run all tests (unit + API integration)
npm run test:all
```

## Test Coverage

Run tests with coverage:
```bash
npm test
```

Coverage report will be generated in `coverage/` directory.

**Target Coverage**: 80%+

## Writing Tests

### Unit Test Example (Jest):
```javascript
describe('MyFunction', () => {
    test('should do something', () => {
        const result = myFunction(input);
        expect(result).toBe(expected);
    });
});
```

### Using Mocks:
```javascript
// Mock a module
jest.mock('../../services/llmService');

// Mock a function
const mockFn = jest.fn().mockReturnValue('mocked value');

// Spy on console
const spy = jest.spyOn(console, 'log').mockImplementation();
```

## Troubleshooting

### "Cannot find module 'jest'"
```bash
npm install
```

### "Tests are failing"
1. Check that you're in the backend directory
2. Ensure all dependencies are installed
3. Check for environment variables (unit tests don't need them)

### "Integration tests failing"
1. Ensure server is running (`npm start`)
2. Check that server is on port 3001
3. Verify `GEMINI_API_KEY` is set for LLM tests

## CI/CD

### Recommended Strategy:

**On Every Commit** (fast, no external dependencies):
- ✅ Unit tests only (`npm test`)
- ✅ < 1 second execution time
- ✅ No API key needed
- ✅ 80%+ code coverage

**On PR/Merge to Main** (slower, requires server):
- ✅ Unit tests + API integration tests (`npm run test:all`)
- ✅ ~30 seconds execution time
- ✅ No API key needed (skips LLM-dependent upload tests)

**Nightly/Pre-Release** (slowest, requires API key):
- ✅ All tests including LLM integration
- ✅ ~90 seconds execution time
- ✅ Requires GEMINI_API_KEY secret

### GitHub Actions Example:
```yaml
- name: Install dependencies
  run: npm install

- name: Run unit tests
  run: npm test

- name: Run integration tests
  run: |
    npm start &
    sleep 5
    npm run test:integration
```

## Documentation

See test specifications:
- `unit/test_spec_llm-unit.md` - LLMService unit test spec
- `unit/test_spec_index-unit.md` - Handlers unit test spec
- `integration/test_spec_api-integration.md` - API integration test spec
- `integration/test_spec_llm-integration.md` - LLM integration test spec
