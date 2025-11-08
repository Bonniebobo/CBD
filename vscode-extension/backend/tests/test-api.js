#!/usr/bin/env node

/**
 * API Integration Tests
 * 
 * Tests the backend HTTP endpoints including:
 * - Health check endpoint
 * - Upload endpoint with various prompts
 * - Error handling (missing files, missing prompt)
 * - 404 handling
 * - Backend-frontend integration simulation
 * 
 * Note: Requires the backend server to be running on port 3001
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { mockFiles, testPrompts } = require('./test-data');

const BACKEND_URL = 'http://localhost:3001';

/**
 * Make HTTP request helper
 */
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

/**
 * Make HTTP request (alternative implementation for integration tests)
 */
function makeHttpRequest(url, data) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(url);
            const postData = JSON.stringify(data);

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },
            };

            const client = urlObj.protocol === 'https:' ? https : http;

            const req = client.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            const parsed = JSON.parse(responseData);
                            resolve({ success: true, data: parsed });
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        }
                    } catch (parseError) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Check if backend is running
 */
async function checkBackendHealth() {
    return new Promise((resolve) => {
        const url = new URL(`${BACKEND_URL}/health`);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.request({
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'GET',
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.status === 'healthy');
                } catch {
                    resolve(false);
                }
            });
        });

        req.on('error', () => resolve(false));
        req.end();
    });
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
    console.log('🏥 Testing health check endpoint...');
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/health',
            method: 'GET',
        };

        const result = await makeRequest(options);

        if (result.status === 200 && result.data.status === 'healthy') {
            console.log('✅ Health check passed');
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Uptime: ${result.data.uptime}s`);
            if (result.data.llmStatus) {
                console.log(`   LLM Available: ${result.data.llmStatus.geminiAvailable}`);
            }
            return true;
        } else {
            console.log('❌ Health check failed');
            console.log(`   Status: ${result.status}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Health check failed with error:', error.message);
        return false;
    }
}

/**
 * Test upload endpoint
 */
async function testUploadEndpoint(prompt, files) {
    console.log(`📤 Testing upload endpoint: "${prompt}"`);
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const data = { files, prompt };
        const result = await makeRequest(options, data);

        if (result.status === 200) {
            console.log('✅ Upload test passed');
            console.log(`   Files processed: ${result.data.metadata.filesProcessed}`);
            console.log(`   Total characters: ${result.data.metadata.totalCharacters}`);
            
            if (typeof result.data.aiResponse === 'string') {
                console.log(`   AI response: ${result.data.aiResponse.substring(0, 80)}...`);
            }
            
            // Check for directory tree
            if (result.data.directoryTree) {
                console.log(`   Directory tree: ✅ Present`);
            }
            
            // Check for LLM status
            if (result.data.llmStatus) {
                console.log(`   LLM status: ✅ Present`);
            }
            
            return true;
        } else {
            console.log('❌ Upload test failed');
            console.log(`   Status: ${result.status}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Upload test failed with error:', error.message);
        return false;
    }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
    console.log('🚨 Testing error handling...');
    let allGood = true;

    // Test missing files
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const data = { prompt: 'Test prompt' }; // Missing files
        const result = await makeRequest(options, data);

        if (result.status === 400) {
            console.log('   ✅ Missing files error handled correctly');
        } else {
            console.log('   ❌ Missing files error not handled correctly');
            allGood = false;
        }
    } catch (error) {
        console.log('   ❌ Error handling test failed:', error.message);
        allGood = false;
    }

    // Test missing prompt
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const data = { files: mockFiles }; // Missing prompt
        const result = await makeRequest(options, data);

        if (result.status === 400) {
            console.log('   ✅ Missing prompt error handled correctly');
        } else {
            console.log('   ❌ Missing prompt error not handled correctly');
            allGood = false;
        }
    } catch (error) {
        console.log('   ❌ Error handling test failed:', error.message);
        allGood = false;
    }

    return allGood;
}

/**
 * Test 404 endpoint
 */
async function test404Endpoint() {
    console.log('🔍 Testing 404 endpoint...');
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/nonexistent',
            method: 'GET',
        };

        const result = await makeRequest(options);

        if (result.status === 404) {
            console.log('✅ 404 error handled correctly');
            return true;
        } else {
            console.log('❌ 404 error not handled correctly');
            return false;
        }
    } catch (error) {
        console.log('❌ 404 test failed with error:', error.message);
        return false;
    }
}

/**
 * Test VS Code extension integration
 */
async function testExtensionIntegration() {
    console.log('🔗 Testing VS Code extension integration...');
    
    let passed = 0;
    const testSet = testPrompts.slice(0, 2); // Test first 2 prompts

    for (const prompt of testSet) {
        try {
            const result = await makeHttpRequest(`${BACKEND_URL}/upload`, {
                files: mockFiles,
                prompt: prompt,
            });

            if (result.success && typeof result.data.aiResponse === 'string') {
                console.log(`   ✅ "${prompt}"`);
                passed++;
            } else {
                console.log(`   ❌ "${prompt}" - invalid response format`);
            }
        } catch (error) {
            console.log(`   ❌ "${prompt}" - ${error.message}`);
        }
    }

    console.log(`   Integration: ${passed}/${testSet.length} passed`);
    return passed === testSet.length;
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('🧪 Running API Integration Tests');
    console.log('='.repeat(60));
    console.log('');

    // Check if backend is running
    console.log('🔍 Checking if backend is running...');
    const isHealthy = await checkBackendHealth();

    if (!isHealthy) {
        console.log('❌ Backend is not running or not healthy');
        console.log('   Please start the backend first:');
        console.log('   cd backend && npm start');
        console.log('');
        process.exit(1);
    }

    console.log('✅ Backend is healthy and running');
    console.log('');

    let passed = 0;
    let total = 0;

    // Test health check
    total++;
    if (await testHealthCheck()) { passed++; }
    console.log('');

    // Test upload endpoint with different prompts
    const promptsToTest = testPrompts.slice(0, 3); // Test first 3 prompts
    for (const prompt of promptsToTest) {
        total++;
        if (await testUploadEndpoint(prompt, mockFiles)) { passed++; }
        console.log('');
    }

    // Test error handling
    total++;
    if (await testErrorHandling()) { passed++; }
    console.log('');

    // Test 404
    total++;
    if (await test404Endpoint()) { passed++; }
    console.log('');

    // Test extension integration
    total++;
    if (await testExtensionIntegration()) { passed++; }
    console.log('');

    // Results
    console.log('='.repeat(60));
    console.log(`📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All API tests passed!');
        console.log('');
        console.log('✨ Your backend is ready for:');
        console.log('   • VS Code extension integration');
        console.log('   • Production deployment');
        console.log('   • Health: http://localhost:3001/health');
        console.log('   • Upload: http://localhost:3001/upload');
        console.log('');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed.');
        console.log('   Check the error messages above.');
        console.log('');
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    checkBackendHealth,
    testHealthCheck,
    testUploadEndpoint,
    testErrorHandling,
    test404Endpoint,
    testExtensionIntegration,
    runTests,
};

