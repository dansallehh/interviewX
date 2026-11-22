import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.1.0-test'),
    __COMMIT_SHA__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['models/**/*.ts', 'services/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
