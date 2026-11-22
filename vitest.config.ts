import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.2.0-test'),
    __COMMIT_SHA__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['models/**/*.ts', 'services/**/*.ts'],
      exclude: ['models/env.d.ts', 'models/router.ts', 'models/question.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 75,
      },
    },
  },
});
