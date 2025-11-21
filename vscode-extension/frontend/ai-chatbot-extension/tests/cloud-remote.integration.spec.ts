// Cloud integration test against deployed backend

import { expect } from 'chai';
import { callBackendAPI } from '../src/backendClient';
import type { WorkspaceFile } from '../src/types';

const configuredBackendUrl = process.env.BACKEND_URL || 'https://4xwuxxqbqj.execute-api.us-east-1.amazonaws.com';
const configuredFrontendUrl = process.env.FRONTEND_URL; // currently unused, kept for completeness

describe('Cloud integration: deployed backend', function () {
    this.timeout(20_000);

    if (!configuredBackendUrl) {
        throw new Error('BACKEND_URL is required for cloud integration tests');
    }

    it('CI1: returns AI response from deployed backend', async () => {
        const files: WorkspaceFile[] = [
            {
                filename: 'src/index.ts',
                content: "console.log('hello cloud');",
            },
        ];

        const prompt = 'Cloud integration sanity check';

        const result = await callBackendAPI(prompt, files, configuredBackendUrl);

        expect(result).to.be.a('string');
        expect(result.trim().length).to.be.greaterThan(0);
    });
});
