import { expect, test, type Locator, type Page } from '@playwright/test';

import {
    EXPANDED,
    MEDIUM,
    expectOnlyOneUsersGet,
    installFilterOracleBackend,
    observeUsersRequests,
    openReadyPage,
    requireBox,
} from './filter-oracle.support';

const toolbarActionIds = ['create', 'refresh', 'filters'] as const;
const MEDIUM_CONSTRAINED = { width: 820, height: 900 } as const;

function tableTools(page: Page): Locator {
    return page.locator('[data-cmz-id="table-tools"]');
}

function toolbarAction(
    page: Page,
    id: (typeof toolbarActionIds)[number]
): Locator {
    return page.locator(`[data-cmz-toolbar-action="${id}"]`);
}

async function markExactLegacyToolbar(page: Page): Promise<void> {
    const legacy = await page.evaluate(() => {
        const tools = document.querySelector('[data-cmz-id="table-tools"]');
        const create = document.querySelector('[data-cmz-id="create-user"]');
        const filter = tools?.querySelector('button.filter-toggle');
        const tableTitle = tools?.querySelector('[data-cmz-id="table-title"]');
        const tableSearch = tools?.querySelector(
            '[data-cmz-id="table-search"]'
        );
        const commandCluster = tools?.querySelector(
            '[data-cmz-id="table-command-cluster"]'
        );
        const actionGroup = tools?.querySelector('[data-cmz-toolbar-actions]');
        const buttonNames = [...document.querySelectorAll('button')].map(
            (button) =>
                button.getAttribute('aria-label') ??
                button.textContent?.trim() ??
                ''
        );

        return (
            tools instanceof HTMLFormElement &&
            create instanceof HTMLButtonElement &&
            create.closest('.page-heading-row') !== null &&
            create.closest('[data-cmz-id="table-tools"]') === null &&
            filter instanceof HTMLButtonElement &&
            tableTitle === null &&
            tableSearch === null &&
            commandCluster === null &&
            actionGroup === null &&
            tools.querySelectorAll('button').length === 1 &&
            !buttonNames.some((name) => /^Rafraîchir$/.test(name)) &&
            !buttonNames.some((name) => /^Exporter$/.test(name)) &&
            !document.querySelector('[data-cmz-toolbar-actions]')
        );
    });
    const reason =
        'ADAPT-11c1 : la signature historique conserve Créer dans le heading, le formulaire de recherche comme conteneur, seulement Filtres dans les outils et aucun titre local ni Rafraîchir.';
    test.fail(legacy, reason);
    if (legacy) expect(legacy, reason).toBe(false);
}

async function expectDocumentOrder(locators: Locator[]): Promise<void> {
    const handles = await Promise.all(
        locators.map((locator) => locator.elementHandle())
    );
    for (let index = 0; index < handles.length - 1; index += 1) {
        const current = handles[index];
        const next = handles[index + 1];
        if (!current || !next)
            throw new Error('Contrôle de toolbar introuvable.');
        expect(
            await current.evaluate(
                (element, following) =>
                    Boolean(
                        element.compareDocumentPosition(following) &
                        Node.DOCUMENT_POSITION_FOLLOWING
                    ),
                next
            )
        ).toBe(true);
    }
}

function overlap(
    first: { x: number; y: number; width: number; height: number },
    second: { x: number; y: number; width: number; height: number }
): boolean {
    return !(
        first.x + first.width <= second.x ||
        second.x + second.width <= first.x ||
        first.y + first.height <= second.y ||
        second.y + second.height <= first.y
    );
}

async function openFilters(page: Page): Promise<Locator> {
    await page.getByRole('button', { name: /^Filtres(?: \(\d+\))?$/ }).click();
    const panel = page.locator('#user-filter-panel');
    await expect(panel).toBeVisible();
    return panel;
}

async function markExactLegacyUnboundedPanel(
    page: Page,
    panel: Locator
): Promise<void> {
    const legacy = await panel.evaluate((element) => {
        const workspace = document.querySelector(
            '[data-cmz-id="users-table-workspace"]'
        );
        const tableViewport = document.querySelector('.desktop-table');
        if (
            !(workspace instanceof HTMLElement) ||
            !(tableViewport instanceof HTMLElement)
        ) {
            return false;
        }

        const panelBox = element.getBoundingClientRect();
        const workspaceBox = workspace.getBoundingClientRect();
        const tableBox = tableViewport.getBoundingClientRect();
        return (
            !document.querySelector(
                '[data-cmz-id="table-horizontal-scroll"]'
            ) &&
            Math.abs(panelBox.bottom - workspaceBox.bottom) <= 1 &&
            panelBox.bottom > tableBox.bottom + 1
        );
    });
    const reason =
        'ADAPT-11b : la signature historique étend le panneau jusqu’au bas du workspace, sans rail horizontal borné avant le panneau.';
    test.fail(legacy, reason);
    if (legacy) expect(legacy, reason).toBe(false);
}

test.beforeEach(async ({ page }) => {
    await installFilterOracleBackend(page);
});

test('Expanded : nomme la table à gauche puis regroupe recherche et capacités C5 à droite', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await markExactLegacyToolbar(page);

    const tools = tableTools(page);
    const title = tools.locator('[data-cmz-id="table-title"]');
    const titleLabel = title.locator('[data-cmz-id="table-title-label"]');
    const total = title.locator('[data-cmz-id="table-total"]');
    const searchRegion = tools.locator('[data-cmz-id="table-search"]');
    const commandCluster = tools.locator(
        '[data-cmz-id="table-command-cluster"]'
    );
    const actions = tools.locator('[data-cmz-toolbar-actions]');
    await expect(
        tools.getByRole('heading', { level: 2, name: /Utilisateurs/ })
    ).toHaveCount(1);
    await expect(title).toHaveAttribute('id', 'users-table-title');
    await expect(titleLabel).toHaveText('Utilisateurs');
    await expect(total).toHaveText('1');
    await expect(total).toHaveAccessibleName('1 utilisateur au total');
    await expect(searchRegion).toHaveRole('search');
    await expect(searchRegion).toHaveAccessibleName(
        'Recherche dans les utilisateurs'
    );
    await expect(
        searchRegion.getByLabel('Rechercher un utilisateur')
    ).toBeVisible();
    await expect(commandCluster).toBeVisible();
    await expect(actions).toBeVisible();
    await expect(actions).toHaveRole('group');
    await expect(actions).toHaveAccessibleName(
        'Actions de la liste des utilisateurs'
    );
    await expect(tools.getByRole('toolbar')).toHaveCount(0);
    expect(
        await actions
            .locator('[data-cmz-toolbar-action]')
            .evaluateAll((items) =>
                items.map((item) =>
                    item.getAttribute('data-cmz-toolbar-action')
                )
            )
    ).toEqual(toolbarActionIds);
    await expect(toolbarAction(page, 'create')).toHaveAccessibleName(
        'Créer un utilisateur'
    );
    await expect(toolbarAction(page, 'create')).toHaveText('Créer');
    await expect(toolbarAction(page, 'refresh')).toHaveAccessibleName(
        'Rafraîchir la liste des utilisateurs'
    );
    await expect(toolbarAction(page, 'filters')).toHaveAccessibleName(
        /^Filtres(?: \(\d+\))?$/
    );
    await expect(
        page.locator('[data-cmz-toolbar-action="export"]')
    ).toHaveCount(0);
    await expect(page.locator('[data-cmz-id="create-user"]')).toHaveCount(1);
    const table = page.getByRole('table', {
        name: /Utilisateurs.*1 utilisateur au total/,
    });
    await expect(table).toHaveAttribute('aria-labelledby', 'users-table-title');

    await expectDocumentOrder([title, searchRegion, actions]);

    const [titleBox, searchBox, actionsBox, toolsBox] = await Promise.all([
        title.boundingBox(),
        searchRegion.boundingBox(),
        actions.boundingBox(),
        tools.boundingBox(),
    ]);
    const tableTitle = requireBox(titleBox, 'titre de la table');
    const searchGeometry = requireBox(searchBox, 'recherche de la toolbar');
    const actionGroup = requireBox(actionsBox, 'actions de la toolbar');
    const toolbar = requireBox(toolsBox, 'toolbar');
    expect(tableTitle.x).toBeLessThan(searchGeometry.x);
    expect(searchGeometry.x).toBeLessThan(actionGroup.x);
    expect(actionGroup.x + actionGroup.width).toBeLessThanOrEqual(
        toolbar.x + toolbar.width + 1
    );
});

test('Medium contraint : reflow sans chevauchement ni disparition des commandes essentielles', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM_CONSTRAINED);
    await openReadyPage(page);
    await markExactLegacyToolbar(page);

    const tools = tableTools(page);
    const title = tools.locator('[data-cmz-id="table-title"]');
    const search = tools.locator('[data-cmz-id="table-search"]');
    const actions = tools.locator('[data-cmz-toolbar-actions]');
    const controls = toolbarActionIds.map((id) => toolbarAction(page, id));

    await expect(title).toBeVisible();
    await expect(search).toBeVisible();
    await expect(actions).toBeVisible();
    for (const control of controls) await expect(control).toBeVisible();
    await expectDocumentOrder([title, search, actions]);

    expect(
        await actions
            .locator('[data-cmz-toolbar-action]')
            .evaluateAll((items) =>
                items.map((item) =>
                    item.getAttribute('data-cmz-toolbar-action')
                )
            )
    ).toEqual(toolbarActionIds);

    const toolsBox = requireBox(await tools.boundingBox(), 'toolbar Medium');
    const regions = await Promise.all(
        [title, search, actions].map(async (locator, index) =>
            requireBox(
                await locator.boundingBox(),
                ['titre Medium', 'recherche Medium', 'actions Medium'][index]
            )
        )
    );
    for (const region of regions) {
        expect(region.x).toBeGreaterThanOrEqual(toolsBox.x - 1);
        expect(region.x + region.width).toBeLessThanOrEqual(
            toolsBox.x + toolsBox.width + 1
        );
        expect(region.y).toBeGreaterThanOrEqual(toolsBox.y - 1);
        expect(region.y + region.height).toBeLessThanOrEqual(
            toolsBox.y + toolsBox.height + 1
        );
    }
    for (let first = 0; first < regions.length; first += 1) {
        for (let second = first + 1; second < regions.length; second += 1) {
            expect(overlap(regions[first], regions[second])).toBe(false);
        }
    }

    for (const control of controls) {
        const box = requireBox(
            await control.boundingBox(),
            (await control.getAttribute('data-cmz-toolbar-action')) ??
                'action de toolbar'
        );
        expect(box.width).toBeGreaterThanOrEqual(48);
        expect(box.height).toBeGreaterThanOrEqual(48);
    }
    expect(
        await page.evaluate(
            () =>
                document.documentElement.scrollWidth <=
                document.documentElement.clientWidth + 1
        )
    ).toBe(true);
});

test('Rafraîchir : conserve la requête appliquée et émet exactement un GET users', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await markExactLegacyToolbar(page);

    const roleShortcut = page.locator('[data-cmz-filter-shortcut="role"]');
    await roleShortcut.selectOption('agent');
    await expectOnlyOneUsersGet(requests, 1);
    const table = page.locator('[data-cmz-id="users-table"]');
    const scrollBefore = await table.evaluate((element) => {
        element.scrollLeft = Math.min(
            72,
            element.scrollWidth - element.clientWidth
        );
        return element.scrollLeft;
    });

    const countBeforeRefresh = requests.length;
    await toolbarAction(page, 'refresh').click();
    await expectOnlyOneUsersGet(requests, countBeforeRefresh);
    const request = new URL(requests.at(-1) ?? '', 'https://example.invalid');
    expect(request.searchParams.get('role')).toBe('agent');
    expect(await table.evaluate((element) => element.scrollLeft)).toBe(
        scrollBefore
    );
});

test('capacités absentes : aucune exportation, action de ligne, activation ou dialogue implicite', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);

    await expect(page.getByRole('button', { name: 'Exporter' })).toHaveCount(0);
    await expect(page.locator('[data-cmz-row-action]')).toHaveCount(0);
    await expect(page.locator('[data-cmz-row-actions]')).toHaveCount(0);
    await expect(
        page.getByRole('columnheader', { name: 'Actions' })
    ).toHaveCount(0);

    const rows = page.locator('[data-cmz-id="users-table"] tbody tr');
    await expect(rows).toHaveCount(1);
    expect(
        await rows.first().evaluate((row) => ({
            cursor: getComputedStyle(row).cursor,
            hasClickAttribute: row.hasAttribute('onclick'),
            role: row.getAttribute('role'),
            tabIndex: row.getAttribute('tabindex'),
        }))
    ).toEqual({
        cursor: 'auto',
        hasClickAttribute: false,
        role: null,
        tabIndex: null,
    });
    await expect(rows.first().locator('button, a, input, select')).toHaveCount(
        0
    );

    const urlBefore = page.url();
    await rows.first().locator('td').nth(2).click();
    expect(page.url()).toBe(urlBefore);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(rows.first()).not.toBeFocused();
});

for (const [layout, viewport] of [
    ['Medium', MEDIUM],
    ['Expanded', EXPANDED],
] as const) {
    test(`${layout} : borne le panneau entre la table et son rail horizontal visible`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        const panel = await openFilters(page);
        await markExactLegacyUnboundedPanel(page, panel);

        const tableViewport = page.locator('.desktop-table');
        const rail = page.locator('[data-cmz-id="table-horizontal-scroll"]');
        const [panelBox, tableBox, railBox] = await Promise.all([
            panel.boundingBox(),
            tableViewport.boundingBox(),
            rail.boundingBox(),
        ]);
        const filters = requireBox(panelBox, `panneau ${layout}`);
        const table = requireBox(tableBox, `table ${layout}`);
        const horizontalRail = requireBox(railBox, `rail horizontal ${layout}`);

        expect(Math.abs(filters.y - table.y)).toBeLessThanOrEqual(1);
        expect(filters.y + filters.height).toBeLessThanOrEqual(
            horizontalRail.y + 1
        );
        expect(horizontalRail.x + horizontalRail.width).toBeLessThanOrEqual(
            filters.x + 1
        );
        expect(filters.x + filters.width).toBeLessThanOrEqual(
            table.x + table.width + 1
        );
    });
}
