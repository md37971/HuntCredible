import { describe, it } from '@jest/globals';
import { checkStatus } from './helpers.js';

const competitionId = '123456789012345678901234';
const submissionId = '123456789012345678901235';

describe('Competition Routes', () => {

    it('GET /competitions', async () => {
        await checkStatus('get', '/api/v1/competitions', 401);
    });

    it('GET /competitions/:competitionId', async () => {
        await checkStatus('get', '/api/v1/competitions/invalid-id', 400);
    });

    it('POST /competitions/:competitionId/submit', async () => {
        await checkStatus('post', `/api/v1/competitions/${competitionId}/submit`, 401);
    });

    it('GET /competitions/:competitionId/submissions', async () => {
        await checkStatus('get', `/api/v1/competitions/${competitionId}/submissions`, 401);
    });

    it('DELETE /competitions/:competitionId/submissions/:submissionId', async () => {
        await checkStatus('delete', `/api/v1/competitions/${competitionId}/submissions/${submissionId}`, 401);
    });

    it('PATCH /submissions/:submissionId/vote', async () => {
        await checkStatus('patch', `/api/v1/submissions/${submissionId}/vote`, 401, {});
    });

    it('POST /submissions/:submissionId/report', async () => {
        await checkStatus('post', `/api/v1/submissions/${submissionId}/report`, 401, {});
    });

    it('GET /admin/reports', async () => {
        await checkStatus('get', '/api/v1/admin/reports', 401);
    });

    it('PATCH /admin/reports/:submissionId/dismiss', async () => {
        await checkStatus('patch', `/api/v1/admin/reports/${submissionId}/dismiss`, 401, {});
    });

});