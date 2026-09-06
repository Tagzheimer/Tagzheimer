import { useContext } from 'react';
import { DevicesContext } from '../context/DevicesContext';

/**
 * Device list hook — backed by DevicesProvider (single shared fetch +
 * polling + alerts). Same shape as the original standalone hook.
 */
export function useDevices() {
  const ctx = useContext(DevicesContext);
  if (!ctx) throw new Error('useDevices must be used within DevicesProvider');
  return ctx;
}
