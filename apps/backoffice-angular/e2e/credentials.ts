/**
 * Credentials e2e smoke — **doivent** rester alignés avec
 * `tools/mock-server/credentials.mjs` (SSoT mock).
 *
 * Staging / prod : variables d'env (jamais committer) :
 *   E2E_EMAIL / E2E_PASSWORD  (T12-7)
 */
export const E2E_MOCK_CREDENTIALS = {
    email: process.env.E2E_EMAIL ?? 'admin@cmz.tg',
    password: process.env.E2E_PASSWORD ?? 'Password123!',
} as const;
