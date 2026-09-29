import { expect, test, type Page, type Route } from '@playwright/test';

const COMPACT = { width: 390, height: 844 } as const;
const MEDIUM = { width: 1024, height: 768 } as const;
const EXPANDED = { width: 1440, height: 1024 } as const;
const QUIET_WINDOW_MS = 300;

interface UserWire {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profile: string;
    role: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface UsersRequestContext {
    ordinal: number;
    pageNumber: number;
    route: Route;
    url: URL;
}

interface BackendOptions {
    usersResponder?: (context: UsersRequestContext) => Promise<void>;
}

interface BackendHarness {
    events: string[];
    userRequests: URL[];
}

function user(id: string, label: string): UserWire {
    return {
        id,
        first_name: 'Test',
        last_name: label,
        email: `${id}@example.invalid`,
        phone: '+000 00 00 00 00',
        profile: 'Profil A',
        role: 'agent',
        status: 'active',
        created_at: '2026-09-29T08:00:00Z',
        updated_at: '2026-09-29T08:00:00Z',
    };
}

const PAGE_1_USERS = Array.from({ length: 8 }, (_, index) =>
    user(`page-1-user-${index + 1}`, `Initial ${index + 1}`)
);
const PAGE_2_USERS = [
    user('page-1-user-8', 'Initial 8'),
    ...Array.from({ length: 7 }, (_, index) =>
        user(`page-2-user-${index + 1}`, `Suivant ${index + 1}`)
    ),
];
const LARGE_PAGE_2_USERS = Array.from({ length: 24 }, (_, index) =>
    user(`large-page-2-user-${index + 1}`, `Suite longue ${index + 1}`)
);
const PAGE_3_USERS = Array.from({ length: 4 }, (_, index) =>
    user(`page-3-user-${index + 1}`, `Terminal ${index + 1}`)
);
const FILTERED_USERS = [user('filtered-user', 'Filtré')];
const FRESH_USERS = [user('fresh-user', 'Recherche fraîche')];
const STALE_USERS = [user('stale-user', 'Réponse obsolète')];

const PROFILES = [{ uniq_id: 'profile-a', name: 'Profil A' }];

async function fulfillUsers(
    route: Route,
    pageNumber: number,
    users: readonly UserWire[],
    lastPage = 2,
    total = PAGE_1_USERS.length + PAGE_2_USERS.length - 1
): Promise<void> {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            error: false,
            message: 'SUCCESS',
            data: {
                current_page: pageNumber,
                last_page: lastPage,
                per_page: users.length,
                total,
                data: users,
            },
        }),
    });
}

async function installHostAndBackend(
    page: Page,
    options: BackendOptions = {}
): Promise<BackendHarness> {
    const events: string[] = [];
    const userRequests: URL[] = [];

    await page.addInitScript(() => {
        window.__env = {
            authenticationUrl: '/api/auth/',
            reportUrl: '/api/report/',
            settingUrl: '/api/settings/',
            fileUrl: '/api/file/',
            environmentDeployment: 'DEV',
            enableDebug: false,
            trustedFrameOrigins: [],
        };
        window.__cmzAppAccessContext = {
            authenticated: true,
            permissions: ['users.create'],
        };
    });

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;

        if (
            request.method() === 'GET' &&
            path.endsWith('/settings-and-security/user-profiles/select-field')
        ) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: false,
                    message: 'SUCCESS',
                    data: PROFILES,
                }),
            });
            return;
        }

        if (
            request.method() === 'GET' &&
            path.endsWith('/settings-and-security/users')
        ) {
            userRequests.push(url);
            events.push(`GET ${url.search}`);
            const pageNumber = Number(url.searchParams.get('page') ?? '1');
            const context = {
                ordinal: userRequests.length,
                pageNumber,
                route,
                url,
            };
            if (options.usersResponder) {
                await options.usersResponder(context);
                return;
            }
            await fulfillUsers(
                route,
                pageNumber,
                pageNumber === 1 ? PAGE_1_USERS : PAGE_2_USERS
            );
            return;
        }

        if (
            request.method() === 'POST' &&
            path.endsWith('/settings-and-security/users/store')
        ) {
            events.push('POST users/store');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: false,
                    message: 'SUCCESS',
                    data: 'created-user',
                }),
            });
            return;
        }

        await route.abort('blockedbyclient');
    });

    return { events, userRequests };
}

async function openReadyPage(page: Page): Promise<void> {
    await page.goto('/settings-security/users');
    await page.addStyleTag({
        content:
            '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
}

async function markExactLegacyPaginationAsExpectedFailure(
    page: Page
): Promise<void> {
    const pagination = page.getByRole('navigation', {
        name: 'Pagination des utilisateurs',
    });
    const sentinel = page.locator('[data-cmz-id="mobile-load-sentinel"]');
    const legacy =
        (await page.locator('.mobile-results').isVisible()) &&
        (await pagination.isVisible()) &&
        (await sentinel.count()) === 0;

    if (legacy) {
        await expect(pagination).toBeVisible();
        await expect(sentinel).toHaveCount(0);
    }
    test.fail(
        legacy,
        'ADAPT-9 : la signature historique exacte expose encore la pagination compacte et ne rend aucune sentinelle progressive.'
    );
}

function pageRequests(harness: BackendHarness, pageNumber: number): URL[] {
    return harness.userRequests.filter(
        (url) => Number(url.searchParams.get('page') ?? '1') === pageNumber
    );
}

async function expectNoVisibleLoadingIndicator(page: Page): Promise<void> {
    const visibleIndicators = await page
        .locator(
            '.spinner, .refreshing, [data-cmz-id="loading"], [data-cmz-id="mobile-load-status"]'
        )
        .evaluateAll(
            (elements) =>
                elements.filter((element) => {
                    const style = getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    return (
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        rect.width > 1 &&
                        rect.height > 1
                    );
                }).length
        );
    expect(visibleIndicators).toBe(0);
}

async function expectProgressiveSentinel(page: Page): Promise<void> {
    expect(
        await page.locator('[data-cmz-id="mobile-load-sentinel"]').count()
    ).toBe(1);
}

async function waitForQuietWindow(page: Page): Promise<void> {
    await page.waitForTimeout(QUIET_WINDOW_MS);
}

test('compact : remplace la pagination par une région et une liste sémantiques', async ({
    page,
}) => {
    await installHostAndBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);

    expect(
        await page
            .getByRole('navigation', {
                name: 'Pagination des utilisateurs',
            })
            .count()
    ).toBe(0);
    const region = page.locator('[data-cmz-id="mobile-results"]');
    await expect(region).toHaveRole('region');
    await expect(region).toHaveAccessibleName('Utilisateurs');
    await expect(region.locator('[data-cmz-id="mobile-user-list"]')).toHaveRole(
        'list'
    );
    await expect(region.getByRole('listitem')).not.toHaveCount(0);
    await expect(
        region.locator('[data-cmz-id="mobile-load-sentinel"]')
    ).toHaveCount(1);
});

test('compact : précharge avant la frontière visible, ajoute et déduplique sans loader visible', async ({
    page,
}) => {
    let sentinelStrictlyVisible: boolean | undefined;
    const harness = await installHostAndBackend(page, {
        usersResponder: async ({ pageNumber, route }) => {
            if (pageNumber === 2) {
                const box = await page
                    .locator('[data-cmz-id="mobile-load-sentinel"]')
                    .boundingBox();
                sentinelStrictlyVisible = Boolean(
                    box && box.y < COMPACT.height && box.y + box.height > 0
                );
            }
            await fulfillUsers(
                route,
                pageNumber,
                pageNumber === 1 ? PAGE_1_USERS : PAGE_2_USERS
            );
        },
    });
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);

    await expect.poll(() => pageRequests(harness, 2).length).toBe(1);
    expect(sentinelStrictlyVisible).toBe(false);
    const mobile = page.locator('[data-cmz-id="mobile-results"]');
    await expect(mobile.getByRole('listitem')).toHaveCount(15);
    await expect(mobile.getByText('page-1-user-8@example.invalid')).toHaveCount(
        1
    );
    await expectNoVisibleLoadingIndicator(page);
});

test('compact : garde une seule page suivante en vol quand la sentinelle reste intersectée', async ({
    page,
}) => {
    let releasePage2!: () => void;
    const page2Gate = new Promise<void>((resolve) => {
        releasePage2 = resolve;
    });
    const harness = await installHostAndBackend(page, {
        usersResponder: async ({ pageNumber, route }) => {
            if (pageNumber === 2) await page2Gate;
            await fulfillUsers(
                route,
                pageNumber,
                pageNumber === 1 ? PAGE_1_USERS : PAGE_2_USERS
            );
        },
    });
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);

    await expect.poll(() => pageRequests(harness, 2).length).toBe(1);
    await page
        .locator('[data-cmz-id="mobile-load-sentinel"]')
        .scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, -120);
    await page.mouse.wheel(0, 120);
    await waitForQuietWindow(page);
    expect(pageRequests(harness, 2)).toHaveLength(1);
    await expectNoVisibleLoadingIndicator(page);

    releasePage2();
    await expect(page.getByText('page-2-user-7@example.invalid')).toBeVisible();
    expect(pageRequests(harness, 2)).toHaveLength(1);
});

test('compact : s’arrête exactement à lastPage sans requête ni attente terminale', async ({
    page,
}) => {
    const harness = await installHostAndBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);

    await expect.poll(() => pageRequests(harness, 2).length).toBe(1);
    await expect(page.getByText('page-2-user-7@example.invalid')).toBeVisible();
    await page
        .locator('[data-cmz-id="mobile-results"]')
        .evaluate((element) => element.scrollIntoView({ block: 'end' }));
    await page.mouse.wheel(0, 2_000);
    await waitForQuietWindow(page);

    expect(pageRequests(harness, 3)).toHaveLength(0);
    await expect(
        page.locator('[data-cmz-id="mobile-load-sentinel"]')
    ).toHaveCount(0);
    await expect(page.locator('[data-cmz-id="mobile-load-retry"]')).toHaveCount(
        0
    );
    await expectNoVisibleLoadingIndicator(page);
});

test('compact : conserve les cartes, suspend l’automatisme et reprend exactement la page échouée', async ({
    page,
}) => {
    let page2Attempts = 0;
    const harness = await installHostAndBackend(page, {
        usersResponder: async ({ pageNumber, route }) => {
            if (pageNumber === 2) {
                page2Attempts += 1;
                if (page2Attempts === 1) {
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            error: true,
                            message: 'Indisponible',
                        }),
                    });
                    return;
                }
            }
            await fulfillUsers(
                route,
                pageNumber,
                pageNumber === 1 ? PAGE_1_USERS : PAGE_2_USERS
            );
        },
    });
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);

    const retry = page.locator('[data-cmz-id="mobile-load-retry"]');
    await expect(retry).toBeVisible();
    await expect(page.getByText('page-1-user-1@example.invalid')).toBeVisible();
    await page.mouse.wheel(0, 1_500);
    await waitForQuietWindow(page);
    expect(pageRequests(harness, 2)).toHaveLength(1);

    await retry.click();
    await expect.poll(() => pageRequests(harness, 2).length).toBe(2);
    await expect(page.getByText('page-2-user-7@example.invalid')).toBeVisible();
    await expect(retry).toHaveCount(0);
});

test('compact : une recherche repart de page 1 et rejette une ancienne page 2 tardive', async ({
    page,
}) => {
    let releaseStalePage!: () => void;
    const staleGate = new Promise<void>((resolve) => {
        releaseStalePage = resolve;
    });
    const harness = await installHostAndBackend(page, {
        usersResponder: async ({ pageNumber, route, url }) => {
            const search = url.searchParams.get('search');
            if (search) {
                await fulfillUsers(route, 1, FRESH_USERS, 1, 1);
                return;
            }
            if (pageNumber === 2) {
                await staleGate;
                await fulfillUsers(route, 2, STALE_USERS, 2).catch(() => {
                    // latest-wins peut annuler la route avant sa réponse.
                });
                return;
            }
            await fulfillUsers(route, 1, PAGE_1_USERS, 2);
        },
    });
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);

    await expect.poll(() => pageRequests(harness, 2).length).toBe(1);
    const search = page.getByLabel('Recherche');
    await search.fill('fraîche');
    await search.press('Enter');
    await expect
        .poll(
            () =>
                harness.userRequests.filter(
                    (url) =>
                        url.searchParams.get('page') === '1' &&
                        url.searchParams.get('search') === 'fraîche'
                ).length
        )
        .toBe(1);
    await expect(page.getByText('fresh-user@example.invalid')).toBeVisible();

    releaseStalePage();
    await waitForQuietWindow(page);
    await expect(page.getByText('stale-user@example.invalid')).toHaveCount(0);
    await expect(page.getByText('page-1-user-1@example.invalid')).toHaveCount(
        0
    );
});

test('compact : appliquer puis retirer un filtre invalide les lots et redemande page 1', async ({
    page,
}) => {
    const harness = await installHostAndBackend(page, {
        usersResponder: async ({ pageNumber, route, url }) => {
            if (url.searchParams.get('is_active') === 'false') {
                await fulfillUsers(route, 1, FILTERED_USERS, 1, 1);
                return;
            }
            await fulfillUsers(
                route,
                pageNumber,
                pageNumber === 1 ? PAGE_1_USERS : PAGE_2_USERS
            );
        },
    });
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);
    await expect.poll(() => pageRequests(harness, 2).length).toBe(1);

    await page.getByRole('button', { name: 'Filtres' }).click();
    const dialog = page.locator('#user-filter-panel');
    await dialog.getByRole('button', { name: /^Statut\b/ }).click();
    await dialog.getByRole('radio', { name: 'Inactif' }).check();
    await dialog.getByRole('button', { name: 'Appliquer' }).click();

    await expect
        .poll(
            () =>
                harness.userRequests.filter(
                    (url) =>
                        url.searchParams.get('page') === '1' &&
                        url.searchParams.get('is_active') === 'false'
                ).length
        )
        .toBe(1);
    await expect(page.getByText('filtered-user@example.invalid')).toBeVisible();
    await expect(page.getByText('page-2-user-7@example.invalid')).toHaveCount(
        0
    );

    await page
        .getByRole('button', { name: /^Retirer le filtre Statut/ })
        .click();
    await expect
        .poll(
            () =>
                harness.userRequests.filter(
                    (url) =>
                        url.searchParams.get('page') === '1' &&
                        !url.searchParams.has('is_active')
                ).length
        )
        .toBe(2);
});

test('compact : une création réussie ferme le formulaire et réinitialise explicitement sur page 1', async ({
    page,
}) => {
    const harness = await installHostAndBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);
    await expect.poll(() => pageRequests(harness, 2).length).toBe(1);

    await page.getByRole('button', { name: 'Créer un utilisateur' }).click();
    const dialog = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    await dialog.locator('[data-cmz-id="first-name"]').fill('Ada');
    await dialog.locator('[data-cmz-id="last-name"]').fill('Lovelace');
    await dialog.locator('[data-cmz-id="email"]').fill('ada@example.invalid');
    await dialog.locator('[data-cmz-id="phone"]').fill('+000 00 00 00 01');
    await dialog
        .locator('[data-cmz-id="profile-id"]')
        .selectOption('profile-a');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-cmz-id="created"]')).toBeVisible();
    const postIndex = harness.events.indexOf('POST users/store');
    expect(postIndex).toBeGreaterThanOrEqual(0);
    await expect
        .poll(
            () =>
                harness.events
                    .slice(postIndex + 1)
                    .filter(
                        (event) =>
                            event.startsWith('GET ') &&
                            /page=1(?:&|$)/.test(event)
                    ).length
        )
        .toBeGreaterThanOrEqual(1);
});

test('medium et expanded : gardent la pagination explicite sans chargement automatique', async ({
    page,
}) => {
    const harness = await installHostAndBackend(page);
    await page.setViewportSize(MEDIUM);
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
    expect(harness.userRequests).toHaveLength(1);

    await page.setViewportSize(EXPANDED);
    await waitForQuietWindow(page);
    await expect(pagination).toBeVisible();
    expect(harness.userRequests).toHaveLength(1);
});

test('compact : resize et ajout silencieux conservent le focus et exposent seulement l’état accessible', async ({
    page,
}) => {
    let releasePage2!: () => void;
    const page2Gate = new Promise<void>((resolve) => {
        releasePage2 = resolve;
    });
    const harness = await installHostAndBackend(page, {
        usersResponder: async ({ pageNumber, route }) => {
            if (pageNumber === 2) {
                await page2Gate;
                await fulfillUsers(route, 2, LARGE_PAGE_2_USERS, 3, 36);
                return;
            }
            await fulfillUsers(
                route,
                pageNumber,
                pageNumber === 1 ? PAGE_1_USERS : PAGE_3_USERS,
                3,
                36
            );
        },
    });
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markExactLegacyPaginationAsExpectedFailure(page);
    await expectProgressiveSentinel(page);

    await expect.poll(() => pageRequests(harness, 2).length).toBe(1);
    const region = page.locator('[data-cmz-id="mobile-results"]');
    const status = page.locator('[data-cmz-id="mobile-load-status"]');
    const search = page.getByLabel('Recherche');
    await search.focus();
    await expect(region).toHaveAttribute('aria-busy', 'true');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toBeHidden();
    await expectNoVisibleLoadingIndicator(page);

    releasePage2();
    await expect(
        page.getByText('large-page-2-user-24@example.invalid')
    ).toBeVisible();
    await expect(search).toBeFocused();
    await expect(region).not.toHaveAttribute('aria-busy', 'true');
    await expect(status).toContainText(/utilisateurs? supplémentaire/i);
    const requestsBeforeResize = harness.userRequests.length;

    await page.setViewportSize(MEDIUM);
    await waitForQuietWindow(page);
    await page.setViewportSize(EXPANDED);
    await waitForQuietWindow(page);
    await page.setViewportSize(COMPACT);
    await waitForQuietWindow(page);
    expect(harness.userRequests).toHaveLength(requestsBeforeResize);
    await expect(page.getByText('page-1-user-1@example.invalid')).toBeVisible();
    await expect(
        page.getByText('large-page-2-user-24@example.invalid')
    ).toBeVisible();
});
