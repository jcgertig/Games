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
      // Hard minimums — kept intentionally low so vitest never blocks CI on its
      // own.  The PostToolUse hook in .claude/settings.json is the real guard:
      // it compares against a stored baseline and wakes Claude if any metric drops.
      thresholds: {
        lines:      70,
        functions:  65,
        branches:   65,
        statements: 70,
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
        'lib/online-rooms/components/**',
        'lib/online-rooms/useRoomBootstrap.ts',
        'lib/online-rooms/index.ts',
        '**/*.d.ts',
        'node_modules/**',
        // TODO: add tests for multiplayer API routes
        'app/api/hearts/**',
        'app/api/online/**',
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
