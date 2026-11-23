import { describe, it } from '@jest/globals';
import { checkStatus, checkEndpoint } from './helpers.js';

describe('Auth Routes', () => {

    it('POST /register', async () => {
        await checkStatus('post', '/api/v1/auth/register', 400, {});
    });

    it('POST /login', async () => {
        await checkEndpoint('post', '/api/v1/auth/login', {});
    });

    it('POST /logout', async () => {
        await checkStatus('post', '/api/v1/auth/logout', 200);
    });

    it('GET /me', async () => {
        await checkStatus('get', '/api/v1/auth/me', 401);
    });

});