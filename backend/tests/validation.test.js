import './setup.js';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('validation', () => {
  it('pair requires serialNumber', async () => {
    const r = await request(app).post('/api/devices/pair').send({});
    expect(r.status).toBe(400);
    expect(r.body.errors).toBeDefined();
  });
  it('pair rejects too short serial', async () => {
    const r = await request(app).post('/api/devices/pair').send({ serialNumber: 'ab' });
    expect(r.status).toBe(400);
  });
  it('location update rejects invalid latitude', async () => {
    const r = await request(app).post('/api/location/update')
      .set('Authorization', 'Bearer mock-token')
      .send({ deviceId: '000000000000000000000001', latitude: 200, longitude: 0 });
    expect(r.status).toBe(400);
  });
  it('deviceId validator rejects bad id', async () => {
    const r = await request(app).get('/api/devices/invalid-id')
      .set('Authorization', 'Bearer mock-token');
    expect(r.status).toBe(400);
  });
  it('location history validates deviceId param', async () => {
    const r = await request(app).get('/api/location/not-a-uuid/history')
      .set('Authorization', 'Bearer mock-token');
    expect(r.status).toBe(400);
  });
  it('batch requires fixes array', async () => {
    const r = await request(app).post('/api/location/batch')
      .set('Authorization', 'Bearer mock-token')
      .send({ deviceId: '000000000000000000000001', fixes: [] });
    expect(r.status).toBe(400);
  });
});
