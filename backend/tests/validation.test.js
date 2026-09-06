import { getAppDemoStore } from './setup.js';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

const auth = 'Bearer mock-token';

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

describe('real-data compatibility (legacy serials keep working)', () => {
  it('pair rejects non-conforming serial for NEW devices', async () => {
    const r = await request(app).post('/api/devices/pair').send({ serialNumber: 'TAG 001!' });
    expect(r.status).toBe(400);
  });
  it('legacy non-conforming serial still writes + reads', async () => {
    // Simulate a prod row minted before the charset rule. Uses the app's
    // own store instance (see setup.js dual-module note).
    const store = getAppDemoStore();
    const legacy = await store.Device.create({
      name: 'Legacy', serialNumber: 'TAG 001!', patientName: 'P',
      ownerId: 'demo-user-uuid',
    });
    const w = await request(app).post('/api/location/update').set('Authorization', auth)
      .send({ serialNumber: 'TAG 001!', latitude: 40, longitude: -74 });
    expect(w.status).toBe(201);
    const g = await request(app).get(`/api/devices/serial/${encodeURIComponent('TAG 001!')}`).set('Authorization', auth);
    expect(g.status).toBe(200);
    expect(g.body.device.serialNumber).toBe('TAG 001!');
    await store.Device.findByIdAndDelete(legacy._id);
  });
  it('object serial rejected (no [object Object] rows)', async () => {
    const r = await request(app).post('/api/devices/pair').send({ serialNumber: { $gt: '' } });
    expect(r.status).toBe(400);
  });
});
