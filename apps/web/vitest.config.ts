import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for pure guest-site logic (no DOM). Pages and flows are covered by scripts/screenshots.mjs.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
