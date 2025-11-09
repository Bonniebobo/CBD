import * as http from 'http';
import * as https from 'https';
import {URL} from 'url';
import {WorkspaceFile} from './types';

export async function callBackendAPI(prompt: string, files: WorkspaceFile[], backendUrl: string): Promise<string> {
    const endpoint = new URL('/upload', backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`);
    const client = endpoint.protocol === 'https:' ? https : http;
    const postData = JSON.stringify({files, prompt});

    return new Promise((resolve, reject) => {
        const options: https.RequestOptions = {
            hostname: endpoint.hostname,
            port: endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80),
            path: endpoint.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = client.request(options, (res) => {
            let rawData = '';

            res.on('data', (chunk) => {
                rawData += chunk;
            });

            res.on('end', () => {
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`Backend API error: ${res.statusCode ?? 'unknown'} ${res.statusMessage ?? ''}`.trim()));
                    return;
                }

                try {
                    const payload = JSON.parse(rawData);

                    if (payload.error) {
                        reject(new Error(payload.error));
                        return;
                    }

                    const aiResponse = typeof payload.aiResponse === 'string' ? payload.aiResponse : payload.message;
                    if (typeof aiResponse === 'string' && aiResponse.trim().length > 0) {
                        resolve(aiResponse);
                        return;
                    }

                    reject(new Error('Backend response received but no AI content was provided.'));
                } catch (error) {
                    reject(new Error(`Invalid response from backend: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}
