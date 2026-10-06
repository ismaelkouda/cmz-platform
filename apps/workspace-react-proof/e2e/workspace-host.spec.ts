import { expect, test } from '@playwright/test';

const PROFILE_ENDPOINT = '/api/workspace/profile';

test('conserve la vue, respecte l’historique et ne relance pas le réseau', async ({
    page,
}) => {
    let profileReads = 0;
    let reads = 0;
    let writes = 0;

    page.on('request', (request) => {
        if (request.method() === 'GET') reads += 1;
        if (request.method() === 'POST') writes += 1;
    });
    await page.route(`**${PROFILE_ENDPOINT}`, async (route) => {
        profileReads += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                name: 'Soumaila Kouda',
                role: 'Administrateur',
            }),
        });
    });

    await page.goto('/workspace/dashboard');
    await page.getByRole('button', { name: 'Ouvrir le profil' }).click();
    await expect(page).toHaveURL(/\/workspace\/profile$/);
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    await page.waitForLoadState('networkidle');
    const readsBeforeSwitches = reads;

    const profilePanel = page.getByRole('tabpanel', { name: 'Profil' });
    const note = page.getByRole('textbox', {
        name: 'Note locale non enregistrée',
    });
    const firstInstance = await profilePanel
        .locator('[data-instance-id]')
        .getAttribute('data-instance-id');
    await note.fill('Même instance React');

    await page.getByRole('tab', { name: 'Tableau de bord' }).click();
    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await page.getByRole('tab', { name: 'Profil' }).click();
    await expect(note).toHaveValue('Même instance React');
    expect(
        await profilePanel
            .locator('[data-instance-id]')
            .getAttribute('data-instance-id')
    ).toBe(firstInstance);
    expect(profileReads).toBe(1);
    expect(reads).toBe(readsBeforeSwitches);
    expect(writes).toBe(0);

    await page.getByRole('tab', { name: 'Tableau de bord' }).click();
    await page.goBack();
    await expect(page).toHaveURL(/\/workspace\/profile$/);
    await expect(note).toHaveValue('Même instance React');
    await page.goForward();
    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    expect(profileReads).toBe(1);
    expect(reads).toBe(readsBeforeSwitches);
    expect(writes).toBe(0);
});

test('fermer détruit l’instance et rouvrir restitue un état local vierge', async ({
    page,
}) => {
    let profileReads = 0;
    let reads = 0;
    page.on('request', (request) => {
        if (request.method() === 'GET') reads += 1;
    });
    await page.route(`**${PROFILE_ENDPOINT}`, async (route) => {
        profileReads += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                name: 'Soumaila Kouda',
                role: 'Administrateur',
            }),
        });
    });

    await page.goto('/workspace/profile');
    const note = page.getByRole('textbox', {
        name: 'Note locale non enregistrée',
    });
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    await page.waitForLoadState('networkidle');
    const readsBeforeClose = reads;
    const firstInstance = await page
        .locator('[data-instance-id]')
        .getAttribute('data-instance-id');
    await note.fill('Cette note doit disparaître');

    await page.getByRole('button', { name: 'Fermer Profil' }).click();
    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await expect(page.getByRole('tab', { name: 'Profil' })).toHaveCount(0);
    await expect(page.locator('[data-instance-id]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Ouvrir le profil' }).click();
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    await expect(note).toHaveValue('');
    expect(
        await page
            .locator('[data-instance-id]')
            .getAttribute('data-instance-id')
    ).not.toBe(firstInstance);
    expect(profileReads).toBe(1);
    expect(reads).toBe(readsBeforeClose);
});
