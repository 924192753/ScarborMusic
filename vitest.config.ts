import path from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'lib/jwt.ts',
        'lib/password.ts',
        'lib/sanitize.ts',
        'lib/rate-limit.ts',
        'lib/csrf.ts',
        'lib/upload.ts',
        'lib/validators/song.ts',
        'lib/validators/playlist.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
