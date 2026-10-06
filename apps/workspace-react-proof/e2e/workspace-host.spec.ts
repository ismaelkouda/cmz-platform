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

test('restaure query et fragment exacts sans dupliquer ni recharger la vue', async ({
    page,
}) => {
    let profileReads = 0;
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

    await page.goto('/workspace/profile?section=summary#overview');
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    const profilePanel = page.getByRole('tabpanel', { name: 'Profil' });
    const note = page.getByRole('textbox', {
        name: 'Note locale non enregistrée',
    });
    const instance = await profilePanel
        .locator('[data-instance-id]')
        .getAttribute('data-instance-id');
    await note.fill('URL exacte conservée');

    const updatedUrl =
        '/workspace/profile?section=permissions&filter=active%2Fpending&filter=locked+out#security%2Froles';
    await page.evaluate((url) => {
        window.history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, updatedUrl);
    await expect(page).toHaveURL(
        /\/workspace\/profile\?section=permissions&filter=active%2Fpending&filter=locked\+out#security%2Froles$/
    );
    await expect(profilePanel).toBeVisible();

    await page.getByRole('tab', { name: 'Tableau de bord' }).click();
    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await page.getByRole('tab', { name: 'Profil' }).click();

    await expect(page).toHaveURL(
        /\/workspace\/profile\?section=permissions&filter=active%2Fpending&filter=locked\+out#security%2Froles$/
    );
    await expect(note).toHaveValue('URL exacte conservée');
    await expect(page.getByRole('tab', { name: 'Profil' })).toHaveCount(1);
    expect(
        await profilePanel
            .locator('[data-instance-id]')
            .getAttribute('data-instance-id')
    ).toBe(instance);
    expect(profileReads).toBe(1);
});

test('détruit une vue active révoquée et interdit sa résurrection par l’historique', async ({
    page,
}) => {
    let profileReads = 0;
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

    await page.goto('/workspace/profile?section=security#roles');
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    await page
        .getByRole('textbox', { name: 'Note locale non enregistrée' })
        .fill('Brouillon à détruire');

    await page
        .getByRole('button', { name: 'Révoquer l’accès au profil' })
        .click();

    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await expect(page.getByRole('tab', { name: 'Profil' })).toHaveCount(0);
    await expect(page.locator('[data-instance-id]')).toHaveCount(0);
    await expect(
        page.getByRole('textbox', {
            name: 'Note locale non enregistrée',
        })
    ).toHaveCount(0);
    await expect(page.getByText('Accès au profil révoqué.')).toBeVisible();

    await page.evaluate(() => {
        window.history.pushState(
            null,
            '',
            '/workspace/profile?section=security#roles'
        );
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page).toHaveURL(/\/workspace\/dashboard$/);
    await expect(page.getByRole('tab', { name: 'Profil' })).toHaveCount(0);
    await expect(page.locator('[data-instance-id]')).toHaveCount(0);
    expect(profileReads).toBe(1);
});

test('termine la session, détruit toutes les vues et bloque l’historique', async ({
    page,
}) => {
    let profileReads = 0;
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

    await page.goto('/workspace/profile?section=security#sessions');
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    await page
        .getByRole('textbox', { name: 'Note locale non enregistrée' })
        .fill('Secret de la session terminée');

    await page.getByRole('button', { name: 'Terminer la session' }).click();

    await expect(page).toHaveURL(/\/signed-out$/);
    await expect(page.getByText('Vous êtes déconnecté')).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.locator('[data-instance-id]')).toHaveCount(0);
    await expect(page.locator('[data-dashboard-instance-id]')).toHaveCount(0);

    await page.evaluate(() => {
        window.history.pushState(null, '', '/workspace/profile');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page).toHaveURL(/\/signed-out$/);
    await expect(page.locator('[data-instance-id]')).toHaveCount(0);
    expect(profileReads).toBe(1);
});

test('remplace l’identité par un runtime neuf sans donnée inter-session', async ({
    page,
}) => {
    let profileReads = 0;
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
    const firstDashboard = await page
        .locator('[data-dashboard-instance-id]')
        .getAttribute('data-dashboard-instance-id');
    await page.getByRole('button', { name: 'Ouvrir le profil' }).click();
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    const firstProfile = await page
        .locator('[data-instance-id]')
        .getAttribute('data-instance-id');
    await page
        .getByRole('textbox', { name: 'Note locale non enregistrée' })
        .fill('Ne doit pas changer de session');

    await page.getByRole('button', { name: 'Remplacer la session' }).click();

    await expect(page).toHaveURL(/\/workspace\/profile$/);
    await expect(page.getByRole('tab', { name: 'Profil' })).toHaveCount(1);
    expect(
        await page
            .locator('[data-dashboard-instance-id]')
            .getAttribute('data-dashboard-instance-id')
    ).not.toBe(firstDashboard);
    await expect(page.getByText('Soumaila Kouda')).toBeVisible();
    await expect(
        page.getByRole('textbox', { name: 'Note locale non enregistrée' })
    ).toHaveValue('');
    expect(
        await page
            .locator('[data-instance-id]')
            .getAttribute('data-instance-id')
    ).not.toBe(firstProfile);
    expect(profileReads).toBe(2);
});
