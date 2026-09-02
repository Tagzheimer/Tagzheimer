import { describe, it, expect, vi, beforeEach } from 'vitest';

global.fetch = vi.fn();

import { pair, sendFix, syncBatch, pingBackend } from '../services/api';

describe('mobile api', () => {
  beforeEach(()=> vi.clearAllMocks());
  it('pair calls /pair', async () => {
    (fetch as any).mockResolvedValue({ ok:true, json: async()=>({ success:true, deviceId:'123', accessToken:'tok' }) });
    const r = await pair('http://localhost:5000','TAG-001');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/devices/pair'), expect.objectContaining({ method:'POST' }));
    expect(r.deviceId).toBe('123');
  });
  it('pair throws on error', async () => {
    (fetch as any).mockResolvedValue({ ok:false, status:400, text: async()=>'bad' });
    await expect(pair('http://x','TAG-002')).rejects.toThrow('Pairing failed');
  });
  it('sendFix uses authHeaders when token present', async () => {
    (fetch as any).mockResolvedValue({ ok:true, json: async()=>({ success:true }) });
    const cfg:any={ serial:'TAG-001', backend:'http://x', accessToken:'mytok' };
    const r = await sendFix(cfg, { latitude:48, longitude:2, timestamp:new Date().toISOString() }, 80);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/location/update'), expect.objectContaining({ headers: expect.objectContaining({ Authorization:'Bearer mytok' }) }));
    expect(r.success).toBe(true);
  });
  it('sendFix fails without serial', async () => {
    const r = await sendFix({ serial:'', backend:'http://x', accessToken:null, deviceId:null, interval:60 } as any, { latitude:0, longitude:0, timestamp:new Date().toISOString() }, null);
    expect(r.success).toBe(false);
  });
  it('syncBatch', async () => {
    (fetch as any).mockResolvedValue({ ok:true, json: async()=>({ inserted:2 }) });
    const cfg:any={ serial:'TAG-001', backend:'http://x', accessToken:'tok' };
    const r = await syncBatch(cfg, [{ latitude:1, longitude:1, timestamp:new Date().toISOString() }], 50);
    expect(r.inserted).toBe(2);
  });
  it('pingBackend ok', async () => {
    (fetch as any).mockResolvedValue({ ok:true, json: async()=>({ message:'running' }) });
    const r = await pingBackend('http://x');
    expect(r.ok).toBe(true);
  });
  it('pingBackend unreachable', async () => {
    (fetch as any).mockRejectedValue(new Error('net'));
    const r = await pingBackend('http://x');
    expect(r.ok).toBe(false);
  });
});
