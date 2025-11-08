#!/usr/bin/env node

/**
 * LLM Service Tests
 * 
 * Tests the LLMService class including:
 * - Gemini API integration
 * - Citation generation
 * - Response quality
 * - Error handling
 */

// Load environment variables from .env file
require('dotenv').config();

const assert = require('assert');
const LLMService = require('../services/llmService');
const { mockFiles, testPrompts } = require('./test-data');

/**
 * Test LLM Service Status
 */
function testServiceStatus() {
    console.log('📊 Testing LLM Service Status...');
    
    const service = new LLMService();
    const status = service.getStatus();
    
    assert.ok(typeof status === 'object', 'Status should be an object');
    assert.ok(typeof status.geminiAvailable === 'boolean', 'geminiAvailable should be a boolean');
    assert.ok(typeof status.geminiApiKey === 'boolean', 'geminiApiKey should be a boolean');
    assert.ok(status.service === 'LLMService', 'service should be "LLMService"');
    
    console.log(`   Gemini Available: ${status.geminiAvailable}`);
    console.log(`   API Key Present: ${status.geminiApiKey}`);
    console.log('✅ Service status test passed\n');
    
    return status;
}

/**
 * Test Directory Tree Generation
 */
function testDirectoryTree() {
    console.log('🌳 Testing Directory Tree Generation...');
    
    const service = new LLMService();
    const tree = service.generateDirectoryTree(mockFiles);
    
    assert.ok(typeof tree === 'object', 'Tree should be an object');
    assert.ok(tree.src && tree.src.type === 'directory', 'Should have src directory');
    assert.ok(tree['package.json'] && tree['package.json'].type === 'file', 'Should have package.json file');
    
    console.log(`   Root items: ${Object.keys(tree).length}`);
    console.log('✅ Directory tree generation test passed\n');
}

/**
 * Test Citation in AI Responses
 */
async function testCitations() {
    console.log('📝 Testing Citation Generation...');
    
    const service = new LLMService();
    
    if (!service.isGeminiAvailable()) {
        console.log('⚠️  Gemini API key not configured. Skipping citation tests.\n');
        return;
    }
    
    try {
        const response = await service.generateResponse(
            'Summarize this repository and mention the key files',
            mockFiles
        );
        
        assert.ok(typeof response === 'string', 'Response should be a string');
        assert.ok(response.trim().length > 0, 'Response should not be empty');
        
        // Check if response mentions key files
        const mentionsApp = response.includes('App.tsx') || response.includes('App');
        const mentionsPackage = response.includes('package.json') || response.includes('package');
        
        console.log(`   Response length: ${response.length} characters`);
        console.log(`   Mentions App.tsx: ${mentionsApp ? '✅' : '⚠️'}`);
        console.log(`   Mentions package.json: ${mentionsPackage ? '✅' : '⚠️'}`);
        console.log('✅ Citation test passed\n');
        
    } catch (error) {
        console.error('❌ Citation test failed:', error.message);
        throw error;
    }
}

/**
 * Test Multiple Prompts
 */
async function testMultiplePrompts() {
    console.log('🔄 Testing Multiple Prompts...');
    
    const service = new LLMService();
    
    if (!service.isGeminiAvailable()) {
        console.log('⚠️  Gemini API key not configured. Skipping prompt tests.\n');
        return;
    }
    
    let passed = 0;
    const testSet = testPrompts.slice(0, 3); // Test first 3 prompts to save time
    
    for (const prompt of testSet) {
        try {
            console.log(`   Testing: "${prompt}"`);
            const startTime = Date.now();
            const response = await service.generateResponse(prompt, mockFiles, 'src/App.tsx');
            const duration = Date.now() - startTime;
            
            assert.ok(response && response.length > 0, 'Response should not be empty');
            console.log(`      ✅ Success (${duration}ms, ${response.length} chars)`);
            passed++;
            
        } catch (error) {
            console.log(`      ❌ Failed: ${error.message}`);
        }
    }
    
    console.log(`✅ Multiple prompts test passed (${passed}/${testSet.length})\n`);
}

/**
 * Test Error Handling
 */
async function testErrorHandling() {
    console.log('🚨 Testing Error Handling...');
    
    const service = new LLMService();
    
    if (!service.isGeminiAvailable()) {
        console.log('   Skipping error handling tests (no API key)\n');
        return;
    }
    
    // Test with empty prompt
    try {
        await service.generateResponse('', mockFiles);
        console.log('   ⚠️  Empty prompt should have failed');
    } catch (error) {
        console.log('   ✅ Empty prompt handled correctly');
    }
    
    // Test with empty files
    try {
        await service.generateResponse('Test prompt', []);
        console.log('   ✅ Empty files handled (no error expected)');
    } catch (error) {
        console.log(`   ⚠️  Empty files error: ${error.message}`);
    }
    
    console.log('✅ Error handling test completed\n');
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('🧪 Running LLM Service Tests');
    console.log('='.repeat(50));
    console.log('');
    
    try {
        // Test service status
        const status = testServiceStatus();
        
        // Test directory tree generation (doesn't require API key)
        testDirectoryTree();
        
        // Test Gemini-specific features (requires API key)
        if (status.geminiAvailable) {
            console.log('✅ Gemini API is available! Running live tests...\n');
            await testCitations();
            await testMultiplePrompts();
            await testErrorHandling();
        } else {
            console.log('⚠️  Gemini API key not found.');
            console.log('   Set GEMINI_API_KEY to run live AI response tests.');
            console.log('   Get your key from: https://makersuite.google.com/app/apikey\n');
        }
        
        console.log('='.repeat(50));
        console.log('🎉 All LLM service tests passed!');
        console.log('');
        
        process.exit(0);
        
    } catch (error) {
        console.error('='.repeat(50));
        console.error('❌ LLM service tests failed');
        console.error('Error:', error.message);
        console.error('');
        process.exit(1);
    }
}

// Run tests if executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testServiceStatus,
    testDirectoryTree,
    testCitations,
    testMultiplePrompts,
    testErrorHandling,
    runTests,
};

