import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => {
  const instance = {
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    get: vi.fn(), post: vi.fn(), delete: vi.fn(),
  };
  const create = vi.fn(() => instance);
  return { default: { create } };
});

describe('api layer', () => {
  it('exports devicesAPI with expected methods', async () => {
    const { devicesAPI, locationAPI } = await import('../services/api.js');
    expect(typeof devicesAPI.getAll).toBe('function');
    expect(typeof devicesAPI.pair).toBe('function');
    expect(typeof devicesAPI.claim).toBe('function');
    expect(typeof locationAPI.getHistory).toBe('function');
    expect(typeof locationAPI.batch).toBe('function');
  });
});
