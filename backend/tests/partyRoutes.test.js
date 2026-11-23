import { describe, it } from '@jest/globals';
import { checkStatus } from './helpers.js';

const partyId = '123456789012345678901234';
const userId = '123456789012345678901235';
const pinId = '123456789012345678901236';
const messageId = '123456789012345678901237';

describe('Party Routes', () => {

    it('POST /parties', async () => {
        await checkStatus('post', '/api/v1/parties', 401, {});
    });

    it('GET /parties', async () => {
        await checkStatus('get', '/api/v1/parties', 401);
    });

    it('GET /parties/:partyId', async () => {
        await checkStatus('get', `/api/v1/parties/${partyId}`, 401);
    });

    it('PATCH /parties/:partyId', async () => {
        await checkStatus('patch', `/api/v1/parties/${partyId}`, 401, {});
    });

    it('DELETE /parties/:partyId', async () => {
        await checkStatus('delete', `/api/v1/parties/${partyId}`, 401);
    });

    it('POST /parties/:partyId/join', async () => {
        await checkStatus('post', `/api/v1/parties/${partyId}/join`, 401);
    });

    it('POST /parties/:partyId/leave', async () => {
        await checkStatus('post', `/api/v1/parties/${partyId}/leave`, 401);
    });

    it('GET /parties/:partyId/members', async () => {
        await checkStatus('get', `/api/v1/parties/${partyId}/members`, 401);
    });

    it('DELETE /parties/:partyId/members/:userId', async () => {
        await checkStatus('delete', `/api/v1/parties/${partyId}/members/${userId}`, 401);
    });

    it('POST /parties/join', async () => {
        await checkStatus('post', '/api/v1/parties/join', 401, {});
    });

    // Pins

    it('POST /parties/:partyId/pins', async () => {
        await checkStatus('post', `/api/v1/parties/${partyId}/pins`, 401, {});
    });

    it('GET /parties/:partyId/pins', async () => {
        await checkStatus('get', `/api/v1/parties/${partyId}/pins`, 401);
    });

    it('GET /parties/:partyId/pins/:pinId', async () => {
        await checkStatus('get', `/api/v1/parties/${partyId}/pins/${pinId}`, 401);
    });

    it('PATCH /parties/:partyId/pins/:pinId', async () => {
        await checkStatus('patch', `/api/v1/parties/${partyId}/pins/${pinId}`, 401, {});
    });

    it('DELETE /parties/:partyId/pins/:pinId', async () => {
        await checkStatus('delete', `/api/v1/parties/${partyId}/pins/${pinId}`, 401);
    });

    // Messages

    it('GET /parties/:partyId/messages', async () => {
        await checkStatus('get', `/api/v1/parties/${partyId}/messages`, 401);
    });

    it('POST /parties/:partyId/messages', async () => {
        await checkStatus('post', `/api/v1/parties/${partyId}/messages`, 401, {});
    });

    it('DELETE /parties/messages/:messageId', async () => {
        await checkStatus('delete', `/api/v1/parties/messages/${messageId}`, 401);
    });

});