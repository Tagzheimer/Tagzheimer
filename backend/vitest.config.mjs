import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    env: { DEMO_MODE: 'true', JWT_SECRET: 'test-secret', NODE_ENV: 'test', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', SUPABASE_JWT_SECRET: 'test' },
    globals: true,
    include: ['tests/**/*.test.js'],
    testTimeout: 10000,
  },
});
