import { test, expect } from '@playwright/test';
import { E2E_MOCK_CREDENTIALS } from './credentials';
import { fillLogin, gotoLogin, submitLogin } from './login.page';

/**
 * T12-6 / ADR-0008 — smoke e2e login contre **mock-server** local.
 *
 * Contrat :
 * 1. Page login accessible sans session
 * 2. Formulaire a11y structurel (labels liés + submit)
 * 3. Credentials mock valides → navigation `/` → `dashboard`
 * 4. Credentials invalides → reste sur login
 *
 * Hors scope (T12-7 / T5-1) : staging réel, 401→logout.
 * pathsGuard métier mock : `e2e/rbac-paths.spec.ts` (T5-3).
 */
test.describe('smoke auth — login (mock)', () => {
    test('affiche le formulaire login (email / password / submit)', async ({
        page,
    }) => {
        await gotoLogin(page);
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('label[for="email"]')).toBeVisible();
        await expect(page.locator('label[for="password"]')).toBeVisible();
        const submit = page.locator('form button[type="submit"]');
        await expect(submit).toBeVisible();
        // Signal Forms : invalid tant qu'email/mdp vides
        await expect(submit).toBeDisabled();
    });

    test('login mock réussi → redirige vers /dashboard', async ({ page }) => {
        await gotoLogin(page);
        await fillLogin(page, E2E_MOCK_CREDENTIALS);
        const submit = page.locator('form button[type="submit"]');
        await expect(submit).toBeEnabled();
        await submitLogin(page);

        await expect(page).toHaveURL(/\/dashboard(\/)?$/, { timeout: 30_000 });
        // Page RO-view : titre dashboard (i18n peut être clé ou traduction)
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('login invalide → reste sur /auth/login', async ({ page }) => {
        await gotoLogin(page);
        await fillLogin(page, {
            email: 'wrong@example.com',
            password: 'not-the-password',
        });
        await submitLogin(page);

        // mock renvoie 200 { error: true } — session absente ; password clearé
        await expect(page).toHaveURL(/\/auth\/login/);
        await expect(page.locator('#password')).toHaveValue('');
        await expect(page.locator('#email')).toBeVisible();
    });
});
