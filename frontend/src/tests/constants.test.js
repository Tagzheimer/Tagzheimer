import { describe, it, expect } from 'vitest';
import { DEFAULT_LOCATION, MOCK_USER } from '../utils/constants.js';
import { mockDevices } from '../services/mockData.js';

describe('constants', () => {
  it('DEFAULT_LOCATION is NYC area', () => {
    expect(DEFAULT_LOCATION.lat).toBeCloseTo(40.7, 0);
    expect(DEFAULT_LOCATION.lng).toBeCloseTo(-74, 0);
  });
  it('MOCK_USER has required fields', () => {
    expect(MOCK_USER.email).toContain('@');
    expect(MOCK_USER.name).toBeTruthy();
  });
  it('mockDevices has 4 entries', () => {
    expect(mockDevices).toHaveLength(4);
    for (const d of mockDevices) {
      expect(d.serialNumber).toMatch(/^TAG-/);
      expect(d.battery).toBeGreaterThanOrEqual(0);
      expect(d.battery).toBeLessThanOrEqual(100);
    }
  });
});
