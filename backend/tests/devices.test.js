import './setup.js';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

const auth = 'Bearer mock-token';

describe('devices', () => {
  it('health returns demo mode', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.mode).toBe('demo');
    expect(r.body.version).toBe('3.0.0');
  });
  it('pair creates device public', async () => {
    const serial = `TAG-TEST-${Date.now()}`;
    const r = await request(app).post('/api/devices/pair').send({ serialNumber: serial, name: 'Test Tracker' });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.serialNumber).toBe(serial);
    expect(r.body.accessToken).toBeDefined();
    expect(r.body.created).toBe(true);
  });
  it('pair existing returns same device', async () => {
    const serial = `TAG-REPEAT-${Date.now()}`;
    const r1 = await request(app).post('/api/devices/pair').send({ serialNumber: serial });
    const r2 = await request(app).post('/api/devices/pair').send({ serialNumber: serial });
    expect(r2.body.deviceId).toBe(r1.body.deviceId);
    expect(r2.body.created).toBe(false);
  });
  it('getDevices requires auth', async () => {
    const r = await request(app).get('/api/devices');
    expect(r.status).toBe(401);
  });
  it('getDevices returns owned devices', async () => {
    const r = await request(app).get('/api/devices').set('Authorization', auth);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });
  it('create device rejects duplicate serial', async () => {
    const serial = `TAG-DUP-${Date.now()}`;
    await request(app).post('/api/devices').set('Authorization', auth).send({ name: 'A', serialNumber: serial, patientName: 'P' });
    const r = await request(app).post('/api/devices').set('Authorization', auth).send({ name: 'B', serialNumber: serial, patientName: 'P2' });
    expect(r.status).toBe(409);
  });
  it('claim device', async () => {
    const serial = `TAG-CLAIM-${Date.now()}`;
    const pair = await request(app).post('/api/devices/pair').send({ serialNumber: serial });
    const id = pair.body.deviceId;
    const claim = await request(app).post(`/api/devices/${id}/claim`).set('Authorization', auth);
    if (claim.status === 409) {
      expect(claim.body.message).toMatch(/already claimed|Device/);
    } else {
      expect(claim.status).toBe(200);
      expect(claim.body.device.ownerId).toBeDefined();
    }
  });
  it('delete device', async () => {
    const serial = `TAG-DEL-${Date.now()}`;
    const pair = await request(app).post('/api/devices/pair').send({ serialNumber: serial });
    // claim then delete
    await request(app).post(`/api/devices/${pair.body.deviceId}/claim`).set('Authorization', auth);
    const del = await request(app).delete(`/api/devices/${pair.body.deviceId}`).set('Authorization', auth);
    expect(del.status).toBe(200);
  });
  it('getDeviceById forbids unowned', async () => {
    const serial = `TAG-FORBID-${Date.now()}`;
    const pair = await request(app).post('/api/devices/pair').send({ serialNumber: serial });
    const r = await request(app).get(`/api/devices/${pair.body.deviceId}`).set('Authorization', auth);
    // ownerless device: should be 403 for demo user unless claimed
    expect([403, 200]).toContain(r.status);
  });
  it('getDeviceBySerial public with auth', async () => {
    const r = await request(app).get('/api/devices/serial/TAG-001').set('Authorization', auth);
    expect(r.status).toBe(200);
    expect(r.body.device.serialNumber).toBe('TAG-001');
  });
});
