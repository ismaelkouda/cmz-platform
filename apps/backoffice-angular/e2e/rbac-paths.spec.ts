import { test, expect } from '@playwright/test';
import { E2E_MOCK_CREDENTIALS } from './credentials';
import { fillLogin, gotoLogin, submitLogin } from './login.page';

/**
 * T5-3 — refus e2e routes hors `CurrentUser.paths` (pathsGuard × mock).
 *
 * Mock paths (SSoT `tools/mock-server/domains/authentication.mjs`) :
 *   autorisés WA : `processing`
 *   refusés WA   : `report-states`, `requests`, `finalization`
 *
 * Contrat produit (pas de page 403) :
 *   deny → `router.createUrlTree(['/auth/login'])`.
 * La `LoginFacade` n’émet de session que sur *login form submit* — un
 * rebond auto vers `/` n’a donc **pas** lieu (session token toujours
 * dans `SessionService` ; authGuard la ré-accepte sur routes autorisées).
 *
 * Hors scope : formats paths staging (T3-2/T5-2), 401→logout (T5-1).
 */
async function loginAsMockAdmin(
    page: import('@playwright/test').Page
): Promise<void> {
    await gotoLogin(page);
    await fillLogin(page, E2E_MOCK_CREDENTIALS);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/dashboard(\/)?$/, { timeout: 30_000 });
}

test.describe('RBAC pathsGuard — refus hors path (mock)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsMockAdmin(page);
    });

    for (const denied of [
        'report-states',
        'requests',
        'finalization',
    ] as const) {
        test(`refuse /${denied} → /auth/login (session conservée)`, async ({
            page,
        }) => {
            await page.goto(`/${denied}`);

            await expect(page).toHaveURL(/\/auth\/login(\/)?$/, {
                timeout: 15_000,
            });
            // Preuve soft-open absente : URL métier absente
            expect(page.url()).not.toMatch(new RegExp(`/${denied}`));

            // Session toujours valide : route autorisée (dashboard hors pathsGuard)
            await page.goto('/dashboard');
            await expect(page).toHaveURL(/\/dashboard(\/)?$/, {
                timeout: 15_000,
            });
        });
    }

    test('autorise /processing quand présent dans mock paths', async ({
        page,
    }) => {
        await page.goto('/processing');
        // Default child redirect → `/processing/queues`
        await expect(page).toHaveURL(/\/processing(\/|$)/, {
            timeout: 30_000,
        });
        await expect(page.locator('h1').first()).toBeVisible({
            timeout: 30_000,
        });
    });
});
