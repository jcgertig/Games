import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      // Global minimums — kept low so vitest never blocks CI on its own.
      // Per-file minimums for the new online room routes are set below.
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   80,
        statements: 80,},
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
        'lib/online-rooms/components/**',
        'lib/online-rooms/useRoomBootstrap.ts',
        'lib/online-rooms/index.ts',
        '**/*.d.ts',
        'node_modules/**',
        'app/api/hearts/**',
        'app/games/hearts/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
