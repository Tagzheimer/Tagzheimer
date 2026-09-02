import './setup.js';
import { describe, it, expect } from 'vitest';
import { generatePairingSecret, issueDeviceToken, verifyDeviceToken, getJwtSecret } from '../utils/deviceTokens.js';

describe('deviceTokens', () => {
  it('generates 64-char hex secret', () => {
    const s = generatePairingSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
    expect(generatePairingSecret()).not.toBe(s);
  });
  it('getJwtSecret returns env value', () => {
    expect(getJwtSecret()).toBe('test-jwt-secret-for-tests');
  });
  it('issues and verifies legacy token (global secret)', async () => {
    const token = issueDeviceToken({ _id: '000000000000000000000001', serialNumber: 'TAG-TEST', pairingSecret: null });
    const decoded = await verifyDeviceToken(token);
    expect(decoded.kind).toBe('device');
    expect(decoded.deviceId).toBe('000000000000000000000001');
  });
  it('issues and verifies per-device token', async () => {
    const secret = generatePairingSecret();
    const token = issueDeviceToken({ _id: '000000000000000000000002', serialNumber: 'TAG-002', pairingSecret: secret });
    const decoded = await verifyDeviceToken(token, {
      findByDeviceId: async (id) => ({ _id: id, serialNumber: 'TAG-002', pairingSecret: secret }),
    });
    expect(decoded.deviceId).toBe('000000000000000000000002');
  });
  it('rejects invalid token', async () => {
    await expect(verifyDeviceToken('not.a.token')).rejects.toThrow();
  });
  it('rejects per-device token without resolver', async () => {
    const secret = generatePairingSecret();
    const token = issueDeviceToken({ _id: '000000000000000000000003', serialNumber: 'TAG-003', pairingSecret: secret });
    await expect(verifyDeviceToken(token)).rejects.toThrow();
  });
});
