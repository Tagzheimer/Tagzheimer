import './setup.js';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('auth', () => {
  it('rejects missing token', async () => {
    const r = await request(app).get('/api/devices');
    expect(r.status).toBe(401);
  });
  it('accepts mock-token in demo mode', async () => {
    const r = await request(app).get('/api/devices').set('Authorization', 'Bearer mock-token');
    expect(r.status).toBe(200);
  });
  it('rejects invalid token', async () => {
    const r = await request(app).get('/api/devices').set('Authorization', 'Bearer invalid-token-xyz');
    expect(r.status).toBe(401);
  });
  it('device token can access location update', async () => {
    const pair = await request(app).post('/api/devices/pair').send({ serialNumber: `TAG-AUTH-${Date.now()}` });
    const r = await request(app).post('/api/location/update').set('Authorization', `Bearer ${pair.body.accessToken}`).send({ latitude: 40, longitude: -74 });
    expect([201, 400]).toContain(r.status);
  });
});
