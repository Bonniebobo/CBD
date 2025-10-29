// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const LLMService = require('./services/llmService');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize LLM Service
const llmService = new LLMService();

// Middleware
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true
}));

// Increase body size limit to 10MB for code uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        llmStatus: llmService.getStatus()
    });
});

// Main upload endpoint
app.post('/upload', async (req, res) => {
    try {
        const { files, prompt } = req.body;
        
        // Validate request
        if (!files || !Array.isArray(files)) {
            return res.status(400).json({
                error: 'Invalid request: files must be an array'
            });
        }
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({
                error: 'Invalid request: prompt must be a string'
            });
        }
        
        // Log incoming request details
        console.log('\n=== NEW UPLOAD REQUEST ===');
        console.log(`Prompt: "${prompt}"`);
        console.log(`Files received: ${files.length}`);
        
        // Log file details
        files.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.filename || 'unnamed'}`);
            console.log(`     Size: ${file.content ? file.content.length : 0} characters`);
            console.log(`     Type: ${file.filename ? file.filename.split('.').pop() : 'unknown'}`);
        });
        
        // Generate directory tree with file previews
        const directoryTree = llmService.generateDirectoryTree(files);
        
        // Generate AI response using LLM service (Gemini)
        const aiResponse = await llmService.generateResponse(prompt, files, null);
        
        // Prepare response
        const response = {
            message: `Successfully processed ${files.length} files.`,
            aiResponse,
            directoryTree: directoryTree,
            llmStatus: llmService.getStatus(),
            metadata: {
                filesProcessed: files.length,
                totalCharacters: files.reduce((sum, file) => sum + (file.content?.length || 0), 0),
                timestamp: new Date().toISOString()
            }
        };
        
        console.log('Response generated successfully');
        console.log('=== END REQUEST ===\n');
        
        res.json(response);
        
    } catch (error) {
        console.error('Error processing upload request:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Code Assistant Backend running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`📤 Upload endpoint: http://localhost:${PORT}/upload`);
    console.log(`🌐 CORS enabled for all origins`);
    console.log(`📦 Max body size: 10MB`);
    console.log(`👥 Supports up to 10 concurrent users`);
    console.log('\n=== Server Ready ===\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
