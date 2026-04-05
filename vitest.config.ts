import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   80,
        statements: 80,
      },
      include: [
        'app/api/**/*.ts',
        'lib/scores/client.ts',
        'lib/scores/config/ladders.ts',
        'lib/scores/internal/iframe-bridge.ts',
      ],
      exclude: [
        'lib/scores/types/**',
        'lib/scores/components/**',
        'lib/scores/hooks/**',
        'lib/scores/index.ts',
        '**/*.d.ts',
        'node_modules/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
