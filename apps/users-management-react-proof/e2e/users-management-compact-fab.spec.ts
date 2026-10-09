import { expect, test, type Locator, type Page } from '@playwright/test';

import {
    installBrowserHost,
    openReadyPage,
    serveDeterministicApi,
} from './users-management.support';

const COMPACT = { width: 390, height: 844 } as const;
const MEDIUM = { width: 900, height: 900 } as const;

async function createPresentation(create: Locator) {
    const box = await create.boundingBox();
    const style = await create.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
            position: computed.position,
            insetInlineEnd: Number.parseFloat(computed.right),
            insetBlockEnd: Number.parseFloat(computed.bottom),
        };
    });
    return { box, style };
}

async function requestCount(page: Page): Promise<number> {
    return page.evaluate(
        () =>
            performance
                .getEntriesByType('resource')
                .filter((entry) => entry.name.includes('/api/settings/')).length
    );
}

test('compact expose un FAB unique sans masquer le dernier résultat', async ({
    page,
}) => {
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page);
    await serveDeterministicApi(page);
    await openReadyPage(page);

    const create = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await expect(create).toHaveCount(1);
    const compact = await createPresentation(create);
    const visibleLabel = create.locator('[class*="actionLabel"]');
    expect(compact.box).not.toBeNull();
    if (!compact.box) throw new Error('Géométrie du FAB indisponible.');
    expect(compact.style.position).toBe('fixed');
    expect(compact.box.width).toBe(56);
    expect(compact.box.height).toBe(56);
    expect(compact.style.insetInlineEnd).toBeGreaterThanOrEqual(16);
    expect(compact.style.insetBlockEnd).toBeGreaterThanOrEqual(16);
    await expect(create).toHaveAttribute('title', 'Créer un utilisateur');
    await expect(create.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(visibleLabel).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const lastCard = page.locator('[class*="userCard"]').last();
    const lastCardBox = await lastCard.boundingBox();
    const scrolledFabBox = await create.boundingBox();
    expect(lastCardBox).not.toBeNull();
    expect(scrolledFabBox).not.toBeNull();
    if (!lastCardBox || !scrolledFabBox)
        throw new Error('Géométrie de fin de liste indisponible.');
    expect(lastCardBox.y + lastCardBox.height).toBeLessThanOrEqual(
        scrolledFabBox.y
    );
});

test('resize conserve le contrôle, le silence réseau et le focus au-dessus du toast', async ({
    page,
}) => {
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page);
    await openReadyPage(page);

    const create = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    const initial = await createPresentation(create);
    expect(initial.style.position).toBe('fixed');
    const requestsBeforeResize = api.requests.length;
    const resourcesBeforeResize = await requestCount(page);

    await page.setViewportSize(MEDIUM);
    await expect(create.getByText('Créer', { exact: true })).toBeVisible();
    expect((await createPresentation(create)).style.position).toBe('static');

    await page.setViewportSize(COMPACT);
    await expect(create.locator('[class*="actionLabel"]')).toHaveCount(0);
    expect((await createPresentation(create)).style.position).toBe('fixed');
    expect(api.requests).toHaveLength(requestsBeforeResize);
    expect(await requestCount(page)).toBe(resourcesBeforeResize);

    await create.click();
    const dialog = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    await dialog.getByLabel(/^Nom/).fill('Lovelace');
    await dialog.getByLabel(/^Prénom/).fill('Ada');
    await dialog.getByLabel(/^Adresse e-mail/).fill('ada@example.test');
    await dialog.getByLabel(/^Téléphone/).fill('+2250102030405');
    await dialog.getByLabel(/^Profil/).selectOption('profile-admin');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();

    await expect(dialog).toHaveCount(0);
    await expect(create).toBeFocused();
    const toast = page.getByRole('status');
    await expect(toast).toHaveText('Utilisateur créé.');
    const toastBox = await toast.boundingBox();
    const focusedFabBox = await create.boundingBox();
    expect(toastBox).not.toBeNull();
    expect(focusedFabBox).not.toBeNull();
    if (!toastBox || !focusedFabBox)
        throw new Error('Géométrie du toast ou du FAB indisponible.');
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(focusedFabBox.y);
});

test('compact conserve la garde de permission avant toute commande', async ({
    page,
}) => {
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page, []);
    const api = await serveDeterministicApi(page);
    await openReadyPage(page);

    const create = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await expect(create).toBeDisabled();
    await expect(create).toHaveAttribute('aria-describedby', 'create-denied');
    await create.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(api.writes()).toBe(0);
});
