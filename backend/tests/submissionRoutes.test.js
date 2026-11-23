import { describe, it } from '@jest/globals';
import { checkStatus } from './helpers.js';

describe('Submission Routes', () => {

    it('POST /submission', async () => {
        await checkStatus('post', '/api/v1/submission', 400);
    });

});