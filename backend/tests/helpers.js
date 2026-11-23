import request from 'supertest';
import { expect } from '@jest/globals';
import app from '../app.js';

// Check whether an endpoint returns the expected status.
export async function checkStatus(method, path, status, body) {
    let response = request(app)[method](path);

    if (body !== undefined) {
        response = response.send(body);
    }

    const result = await response;

    expect(result.status).toBe(status);
}

// Check whether an endpoint exists.
export async function checkEndpoint(method, path, body) {
    let response = request(app)[method](path);

    if (body !== undefined) {
        response = response.send(body);
    }

    const result = await response;

    expect(result.status).not.toBe(404);
}