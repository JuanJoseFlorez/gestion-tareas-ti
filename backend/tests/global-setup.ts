import { execSync } from 'node:child_process';

const TEST_DATABASE_URL = 'postgresql://test:test@localhost:5433/service_requests_test';

// Applies all migrations to db-test once per run. DATABASE_URL is passed explicitly so it can
// never fall back to the development database from ../.env (loadEnvFile does not override it).
export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
