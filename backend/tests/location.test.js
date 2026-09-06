import './setup.js';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

const auth = 'Bearer mock-token';

async function pairAndClaim(serial) {
  const pair = await request(app).post('/api/devices/pair').send({ serialNumber: serial });
  const claim = await request(app).post(`/api/devices/${pair.body.deviceId}/claim`).set('Authorization', auth);
  // Claim rotates the pairing secret: the pair-time token is revoked and a
  // fresh tracker token is returned. Prefer the fresh token when present.
  const accessToken = claim.body?.accessToken || pair.body.accessToken;
  return { ...pair.body, accessToken };
}

describe('location', () => {
  it('update location via deviceId', async () => {
    const { deviceId } = await pairAndClaim(`TAG-LOC-${Date.now()}`);
    const r = await request(app).post('/api/location/update').set('Authorization', auth)
      .send({ deviceId, latitude: 40.7128, longitude: -74.006, meta: { battery: 90, source: 'mobile' } });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
    expect(r.body.location.deviceId).toBe(String(deviceId));
  });
  it('update via serialNumber', async () => {
    const serial = `TAG-LOCSER-${Date.now()}`;
    await pairAndClaim(serial);
    const r = await request(app).post('/api/location/update').set('Authorization', auth)
      .send({ serialNumber: serial, latitude: 41, longitude: -73 });
    expect(r.status).toBe(201);
  });
  it('update via device JWT (no deviceId)', async () => {
    const serial = `TAG-JWT-${Date.now()}`;
    const { deviceId, accessToken } = await pairAndClaim(serial);
    const r = await request(app).post('/api/location/update').set('Authorization', `Bearer ${accessToken}`)
      .send({ latitude: 40.7, longitude: -74 });
    expect(r.status).toBe(201);
  });
  it('batch insert', async () => {
    const { deviceId } = await pairAndClaim(`TAG-BATCH-${Date.now()}`);
    const r = await request(app).post('/api/location/batch').set('Authorization', auth)
      .send({ deviceId, fixes: [{ latitude: 40.71, longitude: -74.01 }, { latitude: 40.72, longitude: -74.02, meta: { battery: 80 } }] });
    expect(r.status).toBe(201);
    expect(r.body.inserted).toBe(2);
  });
  it('getCurrent requires ownership', async () => {
    const { deviceId } = await pairAndClaim(`TAG-CUR-${Date.now()}`);
    await request(app).post('/api/location/update').set('Authorization', auth).send({ deviceId, latitude: 40.7, longitude: -74 });
    const r = await request(app).get(`/api/location/${deviceId}`).set('Authorization', auth);
    expect(r.status).toBe(200);
    expect(r.body.latitude).toBeDefined();
  });
  it('device JWT cannot read another device', async () => {
    const a = await request(app).post('/api/devices/pair').send({ serialNumber: `TAG-A-${Date.now()}` });
    const b = await request(app).post('/api/devices/pair').send({ serialNumber: `TAG-B-${Date.now()}` });
    await request(app).post('/api/location/update').set('Authorization', `Bearer ${a.body.accessToken}`).send({ latitude: 40.7, longitude: -74 });
    const r = await request(app).get(`/api/location/${a.body.deviceId}`).set('Authorization', `Bearer ${b.body.accessToken}`);
    expect(r.status).toBe(403);
  });
  it('history respects limit', async () => {
    const { deviceId } = await pairAndClaim(`TAG-HIST-${Date.now()}`);
    for (let i = 0; i < 3; i++) await request(app).post('/api/location/update').set('Authorization', auth).send({ deviceId, latitude: 40.7 + i * 0.01, longitude: -74 });
    const r = await request(app).get(`/api/location/${deviceId}/history?limit=2`).set('Authorization', auth);
    expect(r.status).toBe(200);
    expect(r.body.locations.length).toBe(2);
  });
  it('404 when no location', async () => {
    const { deviceId } = await pairAndClaim(`TAG-NOLOC-${Date.now()}`);
    const r = await request(app).get(`/api/location/${deviceId}`).set('Authorization', auth);
    expect(r.status).toBe(404);
  });
  it('per-device ingest throttled after burst, other devices unaffected', async () => {
    // Ownerless pair token stays valid (no claim → no rotation).
    const a = await request(app).post('/api/devices/pair').send({ serialNumber: `TAG-BURST-${Date.now()}` });
    const b = await request(app).post('/api/devices/pair').send({ serialNumber: `TAG-QUIET-${Date.now()}` });
    let throttled = 0;
    for (let i = 0; i < 65; i++) {
      const r = await request(app).post('/api/location/update')
        .set('Authorization', `Bearer ${a.body.accessToken}`)
        .send({ latitude: 40.7, longitude: -74 });
      if (r.status === 429) throttled++;
      else expect(r.status).toBe(201);
    }
    expect(throttled).toBeGreaterThan(0);
    // Per-device bucket: a different tracker on the same IP still sends.
    const ok = await request(app).post('/api/location/update')
      .set('Authorization', `Bearer ${b.body.accessToken}`)
      .send({ latitude: 40.7, longitude: -74 });
    expect(ok.status).toBe(201);
  }, 60000);
});
