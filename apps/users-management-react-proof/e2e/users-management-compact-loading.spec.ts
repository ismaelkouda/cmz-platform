import { expect, test, type Page, type TestInfo } from '@playwright/test';

import {
    fulfillUsersPage,
    installBrowserHost,
    serveDeterministicApi,
    type DeterministicApi,
    type UserFixture,
    type UsersRouteContext,
} from './users-management.support';

const COMPACT = { width: 390, height: 844 };
const MEDIUM = { width: 900, height: 900 };
const EXPANDED = { width: 1440, height: 900 };

function users(prefix: string, start: number, count: number): UserFixture[] {
    return Array.from({ length: count }, (_, offset) => {
        const number = start + offset;
        return {
            id: `${prefix}-${number}`,
            firstName: `Prénom ${number}`,
            lastName: `Nom ${number}`,
            email: `${prefix}-${number}@example.test`,
            profile: number % 2 === 0 ? 'Administrateur' : 'Opérateur',
            role: number % 2 === 0 ? 'supervisor' : 'agent',
            status: number % 3 === 0 ? 'inactive' : 'active',
        };
    });
}

const PAGE_1 = users('page-1-user', 1, 8);
const PAGE_2 = [PAGE_1.at(-1) as UserFixture, ...users('page-2-user', 9, 7)];
const FRESH_RESULTS = users('fresh-user', 1, 1);
const FILTERED_RESULTS = users('filtered-user', 1, 1);

async function fulfillDefaultPage(context: UsersRouteContext): Promise<void> {
    await fulfillUsersPage(context.route, {
        users: context.pageNumber === 1 ? PAGE_1 : PAGE_2,
        currentPage: context.pageNumber,
        lastPage: 2,
        total: 15,
    });
}

async function openReadyPage(page: Page): Promise<void> {
    await page.goto('/settings-security/users');
    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
}

function userPageRequests(api: DeterministicApi, pageNumber: number) {
    return api.requests.filter(
        ({ method, search }) =>
            method === 'GET' &&
            Number(new URLSearchParams(search).get('page') ?? '1') ===
                pageNumber
    );
}

async function expectNoVisibleLoader(page: Page): Promise<void> {
    const visible = await page
        .locator(
            '[data-cmz-id="loading"], [data-cmz-id="mobile-load-status"], .spinner, .skeleton'
        )
        .evaluateAll(
            (elements) =>
                elements.filter((element) => {
                    const style = getComputedStyle(element);
                    const box = element.getBoundingClientRect();
                    return (
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        box.width > 1 &&
                        box.height > 1
                    );
                }).length
        );
    expect(visible).toBe(0);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
    const path = testInfo.outputPath(name);
    await page.screenshot({ path, animations: 'disabled', caret: 'hide' });
    await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('compact accumule, déduplique et termine sans pagination ni loader visible', async ({
    page,
}, testInfo) => {
    let releasePage2!: () => void;
    const page2Gate = new Promise<void>((resolve) => {
        releasePage2 = resolve;
    });
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page, {
        usersResponder: async (context) => {
            if (context.pageNumber === 2) await page2Gate;
            await fulfillDefaultPage(context);
        },
    });
    await openReadyPage(page);

    await expect.poll(() => userPageRequests(api, 2).length).toBe(1);
    await expect(
        page.getByRole('navigation', { name: 'Pagination des utilisateurs' })
    ).toHaveCount(0);
    const region = page.locator('[data-cmz-id="mobile-results"]');
    await expect(region).toHaveRole('region');
    await expect(region).toHaveAccessibleName('Utilisateurs');
    await expect(region).toHaveAttribute('aria-busy', 'true');
    await expect(region.getByRole('list')).toBeVisible();
    await expect(region.getByRole('listitem')).toHaveCount(8);
    await expect(
        region.locator('[data-cmz-id="mobile-load-sentinel"]')
    ).toHaveCount(1);
    await expectNoVisibleLoader(page);

    releasePage2();
    await expect(region.getByRole('listitem')).toHaveCount(15);
    await expect(page.getByText(PAGE_1.at(-1)?.email ?? '')).toHaveCount(1);
    await expect(region).not.toHaveAttribute('aria-busy', 'true');
    await expect(
        region.locator('[data-cmz-id="mobile-load-sentinel"]')
    ).toHaveCount(0);
    await expect(
        page.locator('[data-cmz-id="mobile-load-status"]')
    ).toContainText('7 utilisateurs supplémentaires.');
    await expectNoVisibleLoader(page);
    await capture(page, testInfo, 'compact-progressive-complete.actual.png');
});

test('compact verrouille une page en vol puis reprend manuellement la page échouée', async ({
    page,
}, testInfo) => {
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page, {
        usersResponder: async (context) => {
            if (context.pageNumber === 2 && context.attempt === 1) {
                await context.route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: true,
                        message: 'Indisponible',
                    }),
                });
                return;
            }
            await fulfillDefaultPage(context);
        },
    });
    await openReadyPage(page);

    const retry = page.locator('[data-cmz-id="mobile-load-retry"]');
    await expect(retry).toBeVisible();
    await expect(page.getByText(PAGE_1[0].email as string)).toBeVisible();
    await page.mouse.wheel(0, 2_000);
    await page.waitForTimeout(250);
    expect(userPageRequests(api, 2)).toHaveLength(1);
    await expectNoVisibleLoader(page);
    await capture(page, testInfo, 'compact-progressive-retry.actual.png');

    await retry.click();
    await expect.poll(() => userPageRequests(api, 2).length).toBe(2);
    await expect(page.getByText(PAGE_2.at(-1)?.email ?? '')).toBeVisible();
    await expect(retry).toHaveCount(0);
});

test('compact rejette une page tardive et repart de page 1 après recherche et filtre', async ({
    page,
}) => {
    let releaseStalePage!: () => void;
    const staleGate = new Promise<void>((resolve) => {
        releaseStalePage = resolve;
    });
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page, {
        usersResponder: async (context) => {
            if (context.url.searchParams.get('search')) {
                await fulfillUsersPage(context.route, {
                    users: FRESH_RESULTS,
                    currentPage: 1,
                    lastPage: 1,
                });
                return;
            }
            if (context.url.searchParams.get('is_active') === 'false') {
                await fulfillUsersPage(context.route, {
                    users: FILTERED_RESULTS,
                    currentPage: 1,
                    lastPage: 1,
                });
                return;
            }
            if (context.pageNumber === 2) {
                await staleGate;
                await fulfillDefaultPage(context).catch(() => undefined);
                return;
            }
            await fulfillDefaultPage(context);
        },
    });
    await openReadyPage(page);
    await expect.poll(() => userPageRequests(api, 2).length).toBe(1);

    const search = page.getByRole('searchbox', {
        name: 'Rechercher un utilisateur',
    });
    await search.fill('fraîche');
    await search.press('Enter');
    await expect(
        page.getByText(FRESH_RESULTS[0].email as string)
    ).toBeVisible();
    releaseStalePage();
    await page.waitForTimeout(250);
    await expect(page.getByText(PAGE_2.at(-1)?.email ?? '')).toHaveCount(0);

    await search.fill('');
    await search.press('Enter');
    await page.getByRole('button', { name: 'Filtres' }).click();
    const filters = page.getByRole('complementary', {
        name: 'Filtres des utilisateurs',
    });
    await filters.getByRole('radio', { name: 'Inactifs' }).check();
    await filters.getByRole('button', { name: 'Appliquer' }).click();
    await expect(
        page.getByText(FILTERED_RESULTS[0].email as string)
    ).toBeVisible();
    const lastRequest = api.requests.at(-1);
    expect(
        Object.fromEntries(new URLSearchParams(lastRequest?.search))
    ).toEqual({ page: '1', is_active: 'false' });
});

test('compact repart explicitement de page 1 après une création réussie', async ({
    page,
}) => {
    await page.setViewportSize(COMPACT);
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page, {
        usersResponder: fulfillDefaultPage,
    });
    await openReadyPage(page);
    await expect.poll(() => userPageRequests(api, 2).length).toBe(1);

    await page.getByRole('button', { name: 'Créer un utilisateur' }).click();
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
    const postIndex = api.requests.findIndex(({ method }) => method === 'POST');
    expect(postIndex).toBeGreaterThanOrEqual(0);
    await expect
        .poll(
            () =>
                api.requests
                    .slice(postIndex + 1)
                    .filter(
                        ({ method, search }) =>
                            method === 'GET' &&
                            new URLSearchParams(search).get('page') === '1'
                    ).length
        )
        .toBeGreaterThanOrEqual(1);
    await expect(page.getByText(PAGE_1[0].email as string)).toBeVisible();
});

test('medium et expanded gardent la pagination ; un resize seul ne charge rien', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM);
    await installBrowserHost(page);
    const api = await serveDeterministicApi(page, {
        usersResponder: fulfillDefaultPage,
    });
    await openReadyPage(page);

    const pagination = page.getByRole('navigation', {
        name: 'Pagination des utilisateurs',
    });
    await expect(pagination).toBeVisible();
    await expect(
        pagination.getByRole('button', { name: 'Suivant' })
    ).toBeVisible();
    await expect(
        page.locator('[data-cmz-id="mobile-load-sentinel"]')
    ).toHaveCount(0);
    expect(userPageRequests(api, 2)).toHaveLength(0);

    await page.setViewportSize(EXPANDED);
    await page.waitForTimeout(200);
    await page.setViewportSize(COMPACT);
    await page.waitForTimeout(200);
    expect(userPageRequests(api, 2)).toHaveLength(0);

    await page.mouse.wheel(0, 500);
    await expect.poll(() => userPageRequests(api, 2).length).toBe(1);
});
