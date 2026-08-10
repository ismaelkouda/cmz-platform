import { expect, type Page } from '@playwright/test';
import { E2E_MOCK_CREDENTIALS } from './credentials';

/**
 * Page object minimal login — sélecteurs stables (`#email`, `#password`,
 * bouton type=submit) issus de LoginComponent, pas de classes CSS floues.
 */
export async function gotoLogin(page: Page): Promise<void> {
    await page.goto('/auth/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
}

export async function fillLogin(
    page: Page,
    creds: { email: string; password: string } = E2E_MOCK_CREDENTIALS
): Promise<void> {
    await page.locator('#email').fill(creds.email);
    await page.locator('#password').fill(creds.password);
}

export async function submitLogin(page: Page): Promise<void> {
    await page.locator('form button[type="submit"]').click();
}
