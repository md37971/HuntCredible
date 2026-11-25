import { describe, it } from '@jest/globals';
import { checkStatus } from './helpers.js';

const partyId = '123456789012345678901234';
const sessionId = '123456789012345678901235';
const userId = '123456789012345678901236';

describe('Session Routes', () => {

    it('POST /parties/:partyId/sessions', async () => {
        await checkStatus('post', `/api/v1/parties/${partyId}/sessions`, 401, {});
    });

    it('GET /parties/:partyId/sessions/active', async () => {
        await checkStatus('get', `/api/v1/parties/${partyId}/sessions/active`, 401);
    });

    it('GET /parties/:partyId/sessions/:sessionId', async () => {
        await checkStatus('get', `/api/v1/parties/${partyId}/sessions/${sessionId}`, 401);
    });

    it('POST /sessions/:sessionId/end', async () => {
        await checkStatus('post', `/api/v1/sessions/${sessionId}/end`, 401);
    });

    it('GET /sessions/:sessionId/locations', async () => {
        await checkStatus('get', `/api/v1/sessions/${sessionId}/locations`, 401);
    });

    it('PUT /sessions/:sessionId/locations', async () => {
        await checkStatus('put', `/api/v1/sessions/${sessionId}/locations`, 401, {
            latitude: 35.3859,
            longitude: -94.3985
        });
    });

    it('GET /sessions/:sessionId/members/:userId/locations', async () => {
        await checkStatus('get', `/api/v1/sessions/${sessionId}/members/${userId}/locations`, 401);
    });

});