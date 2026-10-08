import { expect, test } from '@playwright/test';

import {
    CREATE_PATH,
    installBrowserHost,
    openReadyPage,
    serveDeterministicApi,
    USERS_PATH,
} from './users-management.support';

test('exécute recherche, filtres et rafraîchissement sur le contrat exact', async ({
    page,
}) => {
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page);
    await openReadyPage(page);

    expect(api.userReads()).toBe(1);
    expect(api.profileReads()).toBe(1);
    expect(api.writes()).toBe(0);
    await expect(page.getByLabel('24 utilisateurs au total')).toBeVisible();

    const search = page.getByRole('searchbox', {
        name: 'Rechercher un utilisateur',
    });
    await search.fill('Mariam Koné');
    await search.press('Enter');
    await expect.poll(api.userReads).toBe(2);
    const searchRequest = api.requests.filter(
        ({ method, pathname }) =>
            method === 'GET' && pathname.endsWith(USERS_PATH)
    )[1];
    expect(new URLSearchParams(searchRequest?.search).get('search')).toBe(
        'Mariam Koné'
    );

    const filterToggle = page.getByRole('button', { name: 'Filtres' });
    await filterToggle.click();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
    const panel = page.getByRole('complementary', {
        name: 'Filtres des utilisateurs',
    });
    await panel.getByLabel('Profil').selectOption('profile-admin');
    await panel.getByLabel('Rôle').selectOption('supervisor');
    await panel.getByRole('radio', { name: 'Actifs', exact: true }).check();
    expect(api.userReads()).toBe(2);
    await panel.getByRole('button', { name: 'Appliquer' }).click();
    await expect.poll(api.userReads).toBe(3);
    await expect(panel).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'Filtres, 3 actifs' })
    ).toBeVisible();

    const filterRequest = api.requests.filter(
        ({ method, pathname }) =>
            method === 'GET' && pathname.endsWith(USERS_PATH)
    )[2];
    const parameters = new URLSearchParams(filterRequest?.search);
    expect(Object.fromEntries(parameters)).toEqual({
        page: '1',
        search: 'Mariam Koné',
        profile: 'profile-admin',
        role: 'supervisor',
        is_active: 'true',
    });

    await page
        .getByRole('button', {
            name: 'Rafraîchir la liste des utilisateurs',
        })
        .click();
    await expect.poll(api.userReads).toBe(4);
    const refreshRequest = api.requests.filter(
        ({ method, pathname }) =>
            method === 'GET' && pathname.endsWith(USERS_PATH)
    )[3];
    expect(refreshRequest?.search).toBe(filterRequest?.search);
    expect(api.writes()).toBe(0);
});

test('valide le formulaire, publie la commande exacte et restitue le focus', async ({
    page,
}) => {
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page);
    await openReadyPage(page);

    const trigger = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await trigger.click();
    const dialog = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-cmz-id="last-name"]')).toBeFocused();

    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(dialog.locator('[data-cmz-id="last-name"]')).toBeFocused();
    await expect(
        dialog.getByText('Nom est obligatoire.', { exact: true })
    ).toBeVisible();
    expect(api.writes()).toBe(0);

    await dialog.getByLabel(/^Nom/).fill('Diabaté');
    await dialog.getByLabel(/^Prénom/).fill('Awa');
    await dialog.getByLabel(/^Adresse e-mail/).fill('awa.diabate@example.test');
    await dialog.getByLabel(/^Téléphone/).fill('+2250102030405');
    await dialog.getByLabel(/^Profil/).selectOption('profile-admin');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('Utilisateur créé.');
    await expect(trigger).toBeFocused();
    await expect.poll(api.writes).toBe(1);
    await expect.poll(api.userReads).toBe(2);

    const command = api.requests.find(
        ({ method, pathname }) =>
            method === 'POST' && pathname.endsWith(CREATE_PATH)
    );
    expect(command?.body).toEqual({
        first_name: 'Awa',
        last_name: 'Diabaté',
        email: 'awa.diabate@example.test',
        phone: '+2250102030405',
        profile_id: 'profile-admin',
    });
});

test('conserve le dialogue et les valeurs après une erreur métier', async ({
    page,
}) => {
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page, {
        createError: 'Cette adresse e-mail existe déjà.',
    });
    await openReadyPage(page);
    await page.getByRole('button', { name: 'Créer un utilisateur' }).click();
    const dialog = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    await dialog.getByLabel(/^Nom/).fill('Koné');
    await dialog.getByLabel(/^Prénom/).fill('Mariam');
    await dialog.getByLabel(/^Adresse e-mail/).fill('mariam.kone@example.test');
    await dialog.getByLabel(/^Téléphone/).fill('+2250506070809');
    await dialog.getByLabel(/^Profil/).selectOption('profile-admin');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();

    await expect(dialog.getByRole('alert')).toHaveText(
        'Cette adresse e-mail existe déjà.'
    );
    await expect(dialog.getByLabel(/^Adresse e-mail/)).toHaveValue(
        'mariam.kone@example.test'
    );
    expect(api.writes()).toBe(1);
    expect(api.userReads()).toBe(1);
});

test('refuse la création sans permission avant tout POST', async ({ page }) => {
    await installBrowserHost(page, []);
    const api = await serveDeterministicApi(page);
    await openReadyPage(page);

    const trigger = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await expect(trigger).toBeDisabled();
    await expect(trigger).toHaveAttribute('aria-describedby', 'create-denied');
    await trigger.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(api.writes()).toBe(0);
});
