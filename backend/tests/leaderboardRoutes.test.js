import { describe, it } from '@jest/globals';
import { checkStatus, checkEndpoint } from './helpers.js';

const userId = '123456789012345678901234';
const competitionId = '123456789012345678901235';

describe('Leaderboard Routes', () => {

    it('GET /leaderboard', async () => {
        await checkEndpoint('get', '/api/v1/leaderboard');
    });

    it('GET /leaderboard/me', async () => {
        await checkStatus('get', '/api/v1/leaderboard/me', 401);
    });

    it('GET /users/:userId/points', async () => {
        await checkStatus('get', `/api/v1/users/${userId}/points`, 401);
    });

    it('GET /users/:userId/points/history', async () => {
        await checkStatus('get', `/api/v1/users/${userId}/points/history`, 401);
    });

    it('GET /competitions/:competitionId/leaderboard', async () => {
        await checkStatus('get', '/api/v1/competitions/invalid-id/leaderboard', 400);
    });

});