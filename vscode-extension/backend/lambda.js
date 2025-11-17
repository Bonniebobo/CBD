const serverless = require('serverless-http');
const app = require('./index');

// Cache the wrapped handler so warm Lambda invocations are faster.
let cachedHandler;

/**
 * AWS Lambda entrypoint for the Express app.
 * API Gateway passes events here, and serverless-http adapts them to Express.
 */
module.exports.handler = async (event, context) => {
    if (!cachedHandler) {
        cachedHandler = serverless(app);
    }

    const response = await cachedHandler(event, context);

    // Ensure CORS headers are always set for browser clients.
    response.headers = {
        ...(response.headers || {}),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
    };

    return response;
};
