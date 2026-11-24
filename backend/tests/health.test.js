import { describe, it } from '@jest/globals';
import { checkStatus } from './helpers.js';

describe('Health Routes', () => {

    it('GET /api/v1/health', async () => {
        await checkStatus('get', '/api/v1/health', 200);
    });

});