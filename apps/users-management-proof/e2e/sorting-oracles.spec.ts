import {
    expect,
    test,
    type Locator,
    type Page,
    type TestInfo,
} from '@playwright/test';
import * as axe from 'axe-core';

import {
    COMPACT,
    EXPANDED,
    MEDIUM_CONSTRAINED,
    command,
    openReadyPage,
    settle,
} from './layout-binding.support';

const SORT_COLUMNS = [
    { id: 'lastName', label: 'Nom', cell: 1 },
    { id: 'firstName', label: 'Prénom', cell: 2 },
    { id: 'email', label: 'Email', cell: 3 },
    { id: 'profile', label: 'Profil', cell: 4 },
    { id: 'role', label: 'Rôle', cell: 5 },
    { id: 'status', label: 'Statut', cell: 6 },
    { id: 'updatedAt', label: 'Mise à jour', cell: 7 },
] as const;

const PROFILES = [
    { uniq_id: 'profile-a', name: 'Profil A' },
    { uniq_id: 'profile-b', name: 'Profil B' },
];

const PAGE_ONE = [
    user(
        'one-zulu',
        'Zulu',
        'Yann',
        'zulu@example.invalid',
        'Profil B',
        'agent',
        'inactive',
        '2026-09-20T08:00:00Z'
    ),
    user(
        'one-elodie',
        'Élodie',
        'Alice',
        'elodie@example.invalid',
        'Profil A',
        'supervisor',
        'active',
        '2026-09-24T08:00:00Z'
    ),
    user(
        'one-alpha',
        'Alpha',
        'Zoé',
        'alpha@example.invalid',
        'Profil B',
        'team-leader',
        'active',
        '2026-09-22T08:00:00Z'
    ),
    user(
        'one-bravo',
        'bravo',
        'Béatrice',
        'bravo@example.invalid',
        'Profil A',
        'agent',
        'inactive',
        '2026-09-21T08:00:00Z'
    ),
];

const PAGE_TWO = [
    user(
        'two-yves',
        'Yves',
        'Luc',
        'yves@example.invalid',
        'Profil A',
        'agent',
        'active',
        '2026-09-18T08:00:00Z'
    ),
    user(
        'two-charlie',
        'Charlie',
        'Mia',
        'charlie@example.invalid',
        'Profil B',
        'supervisor',
        'inactive',
        '2026-09-25T08:00:00Z'
    ),
    user(
        'two-delta',
        'Delta',
        'Noé',
        'delta@example.invalid',
        'Profil A',
        'team-leader',
        'active',
        '2026-09-19T08:00:00Z'
    ),
    user(
        'two-beatrice',
        'Béatrice',
        'Omar',
        'beatrice@example.invalid',
        'Profil B',
        'agent',
        'inactive',
        '2026-09-23T08:00:00Z'
    ),
];

const PAGE_ONE_RECEIVED = ['Zulu', 'Élodie', 'Alpha', 'bravo'];
const PAGE_ONE_ASCENDING = ['Alpha', 'bravo', 'Élodie', 'Zulu'];
const PAGE_ONE_DESCENDING = ['Zulu', 'Élodie', 'bravo', 'Alpha'];
const PAGE_TWO_ASCENDING = ['Béatrice', 'Charlie', 'Delta', 'Yves'];

interface Box {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

function requireBox(box: Box | null, label: string): Box {
    if (!box) throw new Error(`Géométrie introuvable : ${label}`);
    return box;
}

function user(
    id: string,
    lastName: string,
    firstName: string,
    email: string,
    profile: string,
    role: string,
    status: string,
    updatedAt: string
) {
    return {
        id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: '+000 00 00 00 00',
        profile,
        role,
        status,
        created_at: updatedAt,
        updated_at: updatedAt,
    };
}

async function installSortingBackend(page: Page): Promise<string[]> {
    const usersRequests: string[] = [];
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
        const respond = (data: unknown) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: false,
                    message: 'SUCCESS',
                    data,
                }),
            });

        if (
            request.method() === 'GET' &&
            url.pathname.endsWith(
                '/settings-and-security/user-profiles/select-field'
            )
        ) {
            await respond(PROFILES);
            return;
        }

        if (
            request.method() === 'GET' &&
            url.pathname.endsWith('/settings-and-security/users')
        ) {
            usersRequests.push(`${url.pathname}${url.search}`);
            const currentPage = Number(url.searchParams.get('page') ?? '1');
            await respond({
                current_page: currentPage,
                last_page: 2,
                per_page: 4,
                total: 8,
                data: currentPage === 2 ? PAGE_TWO : PAGE_ONE,
            });
            return;
        }

        await route.abort('blockedbyclient');
    });
    return usersRequests;
}

function table(page: Page): Locator {
    return page.locator('[data-cmz-id="users-table"] table');
}

function tableRegion(page: Page): Locator {
    return page.locator('[data-cmz-id="users-table"]');
}

function sortHeader(
    page: Page,
    id: (typeof SORT_COLUMNS)[number]['id']
): Locator {
    return page.locator(`th[mat-sort-header="${id}"]`);
}

function sortButton(
    page: Page,
    id: (typeof SORT_COLUMNS)[number]['id']
): Locator {
    return sortHeader(page, id).getByRole('button');
}

async function visibleColumn(page: Page, cell: number): Promise<string[]> {
    return page
        .locator('[data-cmz-id="users-table"] tbody tr')
        .evaluateAll(
            (rows, cellIndex) =>
                rows.map(
                    (row) =>
                        row
                            .querySelectorAll('td')
                            [cellIndex]?.textContent?.replace(/\s+/g, ' ')
                            .trim() ?? ''
                ),
            cell
        );
}

async function expectSingleActiveSort(
    page: Page,
    id: (typeof SORT_COLUMNS)[number]['id'],
    direction: 'ascending' | 'descending'
): Promise<void> {
    const active = page.locator(
        '[data-cmz-id="users-table"] th[aria-sort="ascending"], [data-cmz-id="users-table"] th[aria-sort="descending"]'
    );
    await expect(active).toHaveCount(1);
    await expect(sortHeader(page, id)).toHaveAttribute('aria-sort', direction);
}

async function tabTo(page: Page, target: Locator): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        await page.keyboard.press('Tab');
        if (
            await target.evaluate(
                (element) =>
                    element === document.activeElement ||
                    element.contains(document.activeElement)
            )
        ) {
            return;
        }
    }
    throw new Error('La navigation Tab n’a pas atteint la cible attendue.');
}

async function expectFullyInside(
    inner: Locator,
    outer: Locator,
    tolerance = 1
): Promise<void> {
    const innerBox = requireBox(await inner.boundingBox(), 'élément intérieur');
    const outerBox = requireBox(await outer.boundingBox(), 'zone défilante');
    expect(innerBox.x).toBeGreaterThanOrEqual(outerBox.x - tolerance);
    expect(innerBox.x + innerBox.width).toBeLessThanOrEqual(
        outerBox.x + outerBox.width + tolerance
    );
    expect(innerBox.y).toBeGreaterThanOrEqual(outerBox.y - tolerance);
    expect(innerBox.y + innerBox.height).toBeLessThanOrEqual(
        outerBox.y + outerBox.height + tolerance
    );
}

async function seriousAxeViolations(root: Locator) {
    await root.page().addScriptTag({ content: axe.source });
    return root.evaluate(async (element) => {
        const runtime = (window as unknown as { axe: typeof axe }).axe;
        const result = await runtime.run(element, {
            runOnly: {
                type: 'tag',
                values: [
                    'wcag2a',
                    'wcag2aa',
                    'wcag21a',
                    'wcag21aa',
                    'wcag22aa',
                ],
            },
        });
        return result.violations
            .filter(
                ({ impact }) => impact === 'serious' || impact === 'critical'
            )
            .map(({ id, impact, nodes }) => ({
                id,
                impact,
                targets: nodes.map(({ target }) => target),
            }));
    });
}

async function capture(
    page: Page,
    testInfo: TestInfo,
    name: string
): Promise<void> {
    await settle(page);
    await page.screenshot({
        path: testInfo.outputPath(name),
        animations: 'disabled',
        caret: 'hide',
        fullPage: true,
    });
}

let usersRequests: string[];

test.beforeEach(async ({ page }) => {
    usersRequests = await installSortingBackend(page);
});

test('inventorie exactement sept colonnes triables hors Compact et laisse le rang informatif', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM_CONSTRAINED);
    await openReadyPage(page);

    await expect(page.locator('th[mat-sort-header]')).toHaveCount(7);
    expect(
        await page
            .locator('th[mat-sort-header]')
            .evaluateAll((headers) =>
                headers.map((header) => header.getAttribute('mat-sort-header'))
            )
    ).toEqual(SORT_COLUMNS.map(({ id }) => id));
    await expect(
        page.locator('[data-cmz-id="row-rank-header"] button')
    ).toHaveCount(0);
    await expect(table(page)).not.toHaveAttribute('role', 'grid');

    await page.setViewportSize(COMPACT);
    await settle(page);
    await expect(page.locator('th[mat-sort-header]')).toHaveCount(0);
    await expect(page.locator('[data-cmz-id="mobile-results"]')).toBeVisible();
    await expect(
        page.locator('[data-cmz-id="mobile-user-list"] li')
    ).toHaveCount(4);
});

test('cycle souris : ordre explicite, portée dite par l’action et l’annonce, aucun bandeau, zéro requête au clic', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await expect.poll(() => usersRequests.length).toBe(1);
    const initialRequestCount = usersRequests.length;
    const header = sortHeader(page, 'lastName');
    const button = sortButton(page, 'lastName');
    const liveRegion = page.locator('.cdk-live-announcer-element');

    expect(await visibleColumn(page, 1)).toEqual(PAGE_ONE_RECEIVED);
    await expect(button).toHaveAccessibleDescription(
        'Trier les lignes affichées par Nom, ordre croissant'
    );

    await button.click();
    await expectSingleActiveSort(page, 'lastName', 'ascending');
    await expect.poll(() => visibleColumn(page, 1)).toEqual(PAGE_ONE_ASCENDING);
    await expect(page.locator('#users-sort-status')).toHaveCount(0);
    await expect(table(page)).not.toHaveAttribute('aria-describedby', /.+/);
    await expect(button).toHaveAccessibleDescription(
        'Tri croissant actif. Trier les lignes affichées par Nom, ordre décroissant'
    );
    await expect(liveRegion).toHaveCount(1);
    await expect(liveRegion).toHaveText(
        'Lignes affichées triées par Nom, ordre croissant'
    );

    await button.click();
    await expectSingleActiveSort(page, 'lastName', 'descending');
    await expect
        .poll(() => visibleColumn(page, 1))
        .toEqual(PAGE_ONE_DESCENDING);
    await expect(button).toHaveAccessibleDescription(
        'Tri décroissant actif. Rétablir l’ordre reçu pour les lignes affichées'
    );
    await expect(liveRegion).toHaveText(
        'Lignes affichées triées par Nom, ordre décroissant'
    );

    await button.click();
    await expect(header).toHaveAttribute('aria-sort', 'none');
    await expect(
        page.locator('th[aria-sort="ascending"], th[aria-sort="descending"]')
    ).toHaveCount(0);
    await expect.poll(() => visibleColumn(page, 1)).toEqual(PAGE_ONE_RECEIVED);
    await expect(page.locator('#users-sort-status')).toHaveCount(0);
    await expect(table(page)).not.toHaveAttribute('aria-describedby', /.+/);
    await expect(liveRegion).toHaveText(
        'Ordre reçu rétabli pour les lignes affichées'
    );

    await settle(page);
    expect(usersRequests).toHaveLength(initialRequestCount);
});

test('cycle clavier : conserve le focus et une seule colonne active', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    const nameButton = sortButton(page, 'lastName');
    const emailButton = sortButton(page, 'email');

    await nameButton.focus();
    await page.keyboard.press('Enter');
    await expect(nameButton).toBeFocused();
    await expectSingleActiveSort(page, 'lastName', 'ascending');

    await page.keyboard.press('Space');
    await expect(nameButton).toBeFocused();
    await expectSingleActiveSort(page, 'lastName', 'descending');

    await emailButton.focus();
    await page.keyboard.press('Enter');
    await expect(emailButton).toBeFocused();
    await expectSingleActiveSort(page, 'email', 'ascending');
    await expect(sortHeader(page, 'lastName')).toHaveAttribute(
        'aria-sort',
        'none'
    );
});

test('réapplique le tri à la page backend suivante sans ajouter de paramètre de tri', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await expect.poll(() => usersRequests.length).toBe(1);

    await sortButton(page, 'lastName').click();
    await expect.poll(() => visibleColumn(page, 1)).toEqual(PAGE_ONE_ASCENDING);
    expect(usersRequests).toHaveLength(1);

    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect.poll(() => usersRequests.length).toBe(2);
    await expect.poll(() => visibleColumn(page, 1)).toEqual(PAGE_TWO_ASCENDING);
    await expectSingleActiveSort(page, 'lastName', 'ascending');
    const nextRequest = new URL(usersRequests[1], 'https://example.invalid');
    expect(nextRequest.searchParams.get('page')).toBe('2');
    expect(nextRequest.searchParams.has('sort')).toBe(false);
    expect(nextRequest.searchParams.has('order_by')).toBe(false);
    expect(nextRequest.searchParams.has('orderby')).toBe(false);
    expect(nextRequest.searchParams.has('direction')).toBe(false);
});

test('D4 Medium : Tab révèle entièrement le dernier en-tête, sa cible et son contour', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM_CONSTRAINED);
    await openReadyPage(page);
    const region = tableRegion(page);
    const header = sortHeader(page, 'updatedAt');
    const button = sortButton(page, 'updatedAt');
    expect(await region.evaluate((element) => element.scrollLeft)).toBe(0);

    await tabTo(page, button);
    await expect(button).toBeFocused();
    await expectFullyInside(header, region);
    await expectFullyInside(button, region);
    expect(
        await region.evaluate((element) => element.scrollLeft)
    ).toBeGreaterThan(0);
    const outline = await header.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            offset: Number.parseFloat(style.outlineOffset),
            style: style.outlineStyle,
            width: Number.parseFloat(style.outlineWidth),
        };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(3);
    expect(outline.offset).toBeLessThanOrEqual(-3);
});

test('contraste forcé : contour et flèche restent rendus, état dit par la description', async ({
    page,
}) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setViewportSize(MEDIUM_CONSTRAINED);
    await openReadyPage(page);
    const header = sortHeader(page, 'lastName');
    const button = sortButton(page, 'lastName');
    await tabTo(page, button);
    await page.keyboard.press('Enter');

    await expectSingleActiveSort(page, 'lastName', 'ascending');
    await expect(button).toHaveAccessibleDescription(
        'Tri croissant actif. Trier les lignes affichées par Nom, ordre décroissant'
    );
    const outline = await header.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            style: style.outlineStyle,
            width: Number.parseFloat(style.outlineWidth),
        };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(3);
    const arrow = header.locator('.mat-sort-header-arrow');
    await expect(arrow).toBeVisible();
    const arrowBox = requireBox(await arrow.boundingBox(), 'flèche de tri');
    expect(arrowBox.width).toBeGreaterThan(0);
    expect(arrowBox.height).toBeGreaterThan(0);
});

for (const [layout, viewport] of [
    ['Medium', MEDIUM_CONSTRAINED],
    ['Expanded', EXPANDED],
] as const) {
    test(`${layout} à 200 % : cibles, tri, focus et visibilité restent intacts`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        await page.addStyleTag({
            content: ':root { font-size: 200% !important; }',
        });
        expect(
            await page.evaluate(() =>
                Number.parseFloat(
                    getComputedStyle(document.documentElement).fontSize
                )
            )
        ).toBeGreaterThanOrEqual(32);

        await sortButton(page, 'lastName').click();
        await expectSingleActiveSort(page, 'lastName', 'ascending');
        const region = tableRegion(page);
        for (const { id } of SORT_COLUMNS) {
            const header = sortHeader(page, id);
            const button = sortButton(page, id);
            await button.focus();
            await expect(button).toBeFocused();
            const box = requireBox(await button.boundingBox(), `${id} à 200 %`);
            expect(box.width).toBeGreaterThanOrEqual(48);
            expect(box.height).toBeGreaterThanOrEqual(48);
            await expectFullyInside(header, region);
            await expectFullyInside(button, region);
        }
        await expectSingleActiveSort(page, 'lastName', 'ascending');
    });
}

test('coexiste avec filtres, panneau, pagination et cartes sans trier Compact', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await sortButton(page, 'lastName').click();

    await page
        .locator('[data-cmz-filter-shortcut="role"]')
        .selectOption('agent');
    await expectSingleActiveSort(page, 'lastName', 'ascending');
    await command(page, 'filters').click();
    await expect(page.locator('#user-filter-panel')).toBeVisible();
    await expectSingleActiveSort(page, 'lastName', 'ascending');
    await command(page, 'filters').click();
    await expect(page.locator('#user-filter-panel')).toBeHidden();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByRole('button', { name: 'Précédent' })).toBeEnabled();

    await page.setViewportSize(COMPACT);
    await settle(page);
    await expect(page.locator('th[mat-sort-header]')).toHaveCount(0);
    await expect(page.locator('[data-cmz-id="mobile-results"]')).toBeVisible();

    await page.setViewportSize(MEDIUM_CONSTRAINED);
    await settle(page);
    await expectSingleActiveSort(page, 'lastName', 'ascending');
});

test('état trié : structure accessible et axe sans violation sérieuse ou critique', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await sortButton(page, 'lastName').click();

    await expect(
        page.getByRole('table', { name: /Utilisateurs/ })
    ).toBeVisible();
    for (const { id, label } of SORT_COLUMNS) {
        await expect(sortHeader(page, id)).toHaveRole('columnheader');
        await expect(sortButton(page, id)).toHaveAccessibleName(
            new RegExp(label)
        );
    }
    expect(await seriousAxeViolations(page.locator('body'))).toEqual([]);
});

for (const [layout, viewport] of [
    ['medium', MEDIUM_CONSTRAINED],
    ['expanded', EXPANDED],
] as const) {
    test(`captures ${layout} : neutre, ascendant, descendant, dernier focus et filtres`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        await capture(page, testInfo, `${layout}-sort-neutral.png`);

        const nameButton = sortButton(page, 'lastName');
        await nameButton.click();
        await capture(page, testInfo, `${layout}-sort-ascending.png`);
        await nameButton.click();
        await capture(page, testInfo, `${layout}-sort-descending.png`);

        const lastButton = sortButton(page, 'updatedAt');
        await page.mouse.move(0, 0);
        await tabTo(page, lastButton);
        await capture(page, testInfo, `${layout}-sort-last-header-focus.png`);

        await command(page, 'filters').click();
        await expect(page.locator('#user-filter-panel')).toBeVisible();
        await capture(page, testInfo, `${layout}-sort-filters-open.png`);
    });
}
