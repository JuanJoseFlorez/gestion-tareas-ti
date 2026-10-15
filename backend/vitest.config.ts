import { defineConfig } from 'vitest/config';

// Integration tests run against the db-test container (docker compose --profile test).
// These credentials are the container's fixed test values, not secrets.
const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5433/service_requests_test',
  CORS_ORIGIN: 'http://localhost:4200',
};

export default defineConfig({
  test: {
    environment: 'node',
    env: TEST_ENV,
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // All integration files share one database, so they must not run in parallel
    fileParallelism: false,
  },
});
