import {
    expect,
    test,
    type Locator,
    type Page,
    type TestInfo,
} from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import {
    COMPACT,
    EXPANDED,
    MEDIUM_CONSTRAINED,
    PAGE_SIZE,
    TOTAL_USERS,
    boundExamples,
    capabilitiesWith,
    command,
    installLayoutBackend,
    openReadyPage,
    searchInput,
    settle,
    type BoundExample,
    type LayoutClass,
} from './layout-binding.support';
import { expectFailureWhileLegacy } from './c5-realization-baseline.support';

// ADR-0098 (Accepted) : ces oracles lisent la liaison expérimentale de la page
// C5. Une capacité ajoutée à la liaison sans sonde ci-dessous fait échouer la
// suite ; une image ne peut donc jamais faire apparaître une capacité par
// omission. Les onglets du workspace relèvent du shell, pas de cette page.

const VIEWPORTS: Record<LayoutClass, { width: number; height: number }> = {
    compact: COMPACT,
    medium: MEDIUM_CONSTRAINED,
    expanded: EXPANDED,
};

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

async function box(locator: Locator, label: string): Promise<Box> {
    const value = await locator.boundingBox();
    if (!value) throw new Error(`Géométrie introuvable : ${label}`);
    return value;
}

const bottom = (value: Box): number => value.y + value.height;
const right = (value: Box): number => value.x + value.width;

function surface(page: Page): Locator {
    return page.locator('[data-cmz-id="users-table-workspace"]');
}

function toolbar(page: Page): Locator {
    return page.locator('[data-cmz-id="table-tools"]');
}

function panel(page: Page): Locator {
    return page.locator('#user-filter-panel');
}

function shortcut(page: Page, key: 'profile' | 'role' | 'status'): Locator {
    return page.locator(`[data-cmz-filter-shortcut="${key}"]`);
}

async function applyShortcut(
    page: Page,
    requests: string[],
    key: 'profile' | 'role' | 'status',
    value: string
): Promise<void> {
    const before = requests.length;
    await shortcut(page, key).selectOption(value);
    await expect.poll(() => requests.length).toBe(before + 1);
}

async function applyCompactStatus(
    page: Page,
    requests: string[]
): Promise<void> {
    await command(page, 'filters').click();
    const sheet = panel(page);
    await sheet.locator('[data-cmz-filter-summary="status"]').click();
    await sheet.getByRole('radio', { name: 'Actif', exact: true }).check();
    // En Compact, le chargement progressif peut précharger la page suivante
    // juste après : on compte la seule requête de première page filtrée.
    const firstFilteredPages = () =>
        requests.filter(
            (search) =>
                search.includes('is_active=true') &&
                /[?&]page=1(?:&|$)/.test(search)
        ).length;
    const before = firstFilteredPages();
    await sheet.getByRole('button', { name: 'Appliquer' }).click();
    await expect.poll(firstFilteredPages).toBe(before + 1);
    await expect(sheet).toHaveCount(0);
}

type CapabilityProbe = (page: Page, layout: LayoutClass) => Promise<void>;

const ABSENT_PROBES: Record<string, CapabilityProbe> = {
    export: async (page) => {
        await expect(page.getByRole('button', { name: /export/i })).toHaveCount(
            0
        );
        await expect(
            page.locator('[data-cmz-toolbar-action="export"]')
        ).toHaveCount(0);
    },
    'row-actions': async (page) => {
        await expect(
            page.getByRole('columnheader', { name: 'Actions' })
        ).toHaveCount(0);
        await expect(
            page.locator('tbody button, tbody a, tbody input, tbody select')
        ).toHaveCount(0);
    },
};

const DECLARED_PROBES: Record<string, CapabilityProbe> = {
    search: async (page) => {
        await expect(searchInput(page)).toBeVisible();
    },
    create: async (page) => {
        await expect(command(page, 'create')).toBeVisible();
        await expect(command(page, 'create')).toHaveAccessibleName(
            'Créer un utilisateur'
        );
    },
    refresh: async (page) => {
        await expect(command(page, 'refresh')).toHaveAccessibleName(
            'Rafraîchir la liste des utilisateurs'
        );
    },
    'filter-trigger': async (page) => {
        await expect(command(page, 'filters')).toHaveAttribute(
            'aria-expanded',
            'false'
        );
    },
    'filter-panel': async (page) => {
        await command(page, 'filters').click();
        await expect(panel(page)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel(page)).toHaveCount(0);
    },
    'column-filters': async (page, layout) => {
        await expect(page.locator('[data-cmz-filter-shortcut]')).toHaveCount(
            layout === 'compact' ? 0 : 3
        );
    },
    'row-rank': async (page, layout) => {
        await expect(
            page.locator('[data-cmz-id="row-rank-header"]')
        ).toHaveCount(layout === 'compact' ? 0 : 1);
    },
    'progressive-loading': async (page, layout) => {
        const pagination = page.getByRole('navigation', {
            name: 'Pagination des utilisateurs',
        });
        await expect(pagination).toHaveCount(layout === 'compact' ? 0 : 1);
        await expect(
            page.locator('[data-cmz-id="mobile-results"]')
        ).toHaveCount(layout === 'compact' ? 1 : 0);
    },
    'create-fab': async (page, layout) => {
        const position = await command(page, 'create').evaluate(
            (element) => getComputedStyle(element).position
        );
        expect(position === 'fixed').toBe(layout === 'compact');
    },
};

test('liaison : toute capacité a une sonde et les exemples couvrent les trois classes', () => {
    expect(
        capabilitiesWith('absent').filter((id) => !ABSENT_PROBES[id])
    ).toEqual([]);
    expect(
        capabilitiesWith('declared').filter((id) => !DECLARED_PROBES[id])
    ).toEqual([]);
    expect(
        [...new Set(boundExamples.map(({ layoutClass }) => layoutClass))].sort()
    ).toEqual(['compact', 'expanded', 'medium']);
});

for (const layout of ['compact', 'medium', 'expanded'] as const) {
    test(`${layout} : rend les capacités déclarées et aucune capacité absente`, async ({
        page,
    }) => {
        if (layout !== 'compact')
            expectFailureWhileLegacy(
                'C5 : en Medium et Expanded, Échap ne ferme pas encore le panneau de filtres.'
            );
        await installLayoutBackend(page);
        await page.setViewportSize(VIEWPORTS[layout]);
        await openReadyPage(page);

        for (const id of capabilitiesWith('absent')) {
            await ABSENT_PROBES[id](page, layout);
        }
        for (const id of capabilitiesWith('declared')) {
            await DECLARED_PROBES[id](page, layout);
        }
    });
}

for (const [label, viewport] of [
    ['Expanded confortable', EXPANDED],
    ['Medium contraint', MEDIUM_CONSTRAINED],
] as const) {
    test(`${label} : une seule surface ordonne barre, tableau, rail et pagination`, async ({
        page,
    }) => {
        expectFailureWhileLegacy(
            'C5 : la vue de données n’a pas encore de bordure supérieure commune.'
        );
        await installLayoutBackend(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);

        const view = surface(page);
        const [viewBox, toolsBox, tableBox, railBox, paginationBox] =
            await Promise.all([
                box(view, 'surface'),
                box(toolbar(page), 'barre'),
                box(page.locator('[data-cmz-id="users-table"]'), 'tableau'),
                box(
                    page.locator('[data-cmz-id="table-horizontal-scroll"]'),
                    'rail'
                ),
                box(
                    page.getByRole('navigation', {
                        name: 'Pagination des utilisateurs',
                    }),
                    'pagination'
                ),
            ]);

        // Une surface bordée unique : la barre n'est pas une carte détachée.
        expect(
            await view.evaluate((element) => {
                const style = getComputedStyle(element);
                return (
                    Number.parseFloat(style.borderTopWidth) > 0 &&
                    style.borderTopStyle !== 'none'
                );
            })
        ).toBe(true);
        expect(
            await toolbar(page).evaluate((element) => {
                const style = getComputedStyle(element);
                return {
                    radius: style.borderTopLeftRadius,
                    side: Number.parseFloat(style.borderLeftWidth),
                };
            })
        ).toEqual({ radius: '0px', side: 0 });
        for (const inner of [toolsBox, tableBox, railBox, paginationBox]) {
            expect(inner.x).toBeGreaterThanOrEqual(viewBox.x - 1);
            expect(right(inner)).toBeLessThanOrEqual(right(viewBox) + 1);
            expect(inner.y).toBeGreaterThanOrEqual(viewBox.y - 1);
            expect(bottom(inner)).toBeLessThanOrEqual(bottom(viewBox) + 1);
        }

        // Ordre des régions, sans bloc intercalé entre la barre et la grille.
        expect(Math.abs(toolsBox.y - viewBox.y)).toBeLessThanOrEqual(2);
        expect(Math.abs(tableBox.y - bottom(toolsBox))).toBeLessThanOrEqual(1);
        expect(railBox.y).toBeGreaterThanOrEqual(bottom(tableBox) - 1);
        expect(paginationBox.y).toBeGreaterThanOrEqual(bottom(railBox) - 1);
        expect(
            Math.abs(bottom(paginationBox) - bottom(viewBox))
        ).toBeLessThanOrEqual(2);

        // Titre et total à gauche, recherche puis commandes à droite, une ligne.
        const [titleBox, searchBox, actionsBox] = await Promise.all([
            box(page.locator('[data-cmz-id="table-title"]'), 'titre'),
            box(page.locator('[data-cmz-id="table-search"]'), 'recherche'),
            box(page.locator('[data-cmz-toolbar-actions]'), 'commandes'),
        ]);
        expect(right(titleBox)).toBeLessThanOrEqual(searchBox.x);
        expect(right(searchBox)).toBeLessThanOrEqual(actionsBox.x);
        expect(titleBox.x - toolsBox.x).toBeLessThan(40);
        expect(right(toolsBox) - right(actionsBox)).toBeLessThan(40);
        for (const region of [titleBox, searchBox, actionsBox]) {
            expect(region.y).toBeGreaterThanOrEqual(toolsBox.y);
            expect(bottom(region)).toBeLessThanOrEqual(bottom(toolsBox));
        }
        expect(searchBox.y).toBeLessThan(bottom(actionsBox));
        expect(actionsBox.y).toBeLessThan(bottom(searchBox));
    });
}

test('commandes : icône et libellé en espace confortable, icônes nommées en espace contraint', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : la commande Créer n’expose pas encore son libellé visible.'
    );
    await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);

    const visibleLabels = {
        create: 'Créer',
        refresh: 'Rafraîchir',
        filters: 'Filtres',
    };
    for (const [id, text] of Object.entries(visibleLabels)) {
        const control = command(page, id as keyof typeof visibleLabels);
        const label = control.locator('[data-cmz-command-label]');
        await expect(label).toHaveText(text);
        await expect(label).toBeVisible();
        await expect(control.locator('svg[aria-hidden="true"]')).toBeVisible();
        const [labelBox, iconBox] = await Promise.all([
            box(label, `libellé ${id}`),
            box(control.locator('svg[aria-hidden="true"]'), `icône ${id}`),
        ]);
        expect(right(iconBox)).toBeLessThanOrEqual(labelBox.x + 1);
    }
    // Le libellé de la recherche reste accessible sans former un bloc visible.
    await expect(
        page.locator('[data-cmz-id="table-search"] label > span').first()
    ).toHaveText('Rechercher un utilisateur');
    expect(
        (
            await box(
                page
                    .locator('[data-cmz-id="table-search"] label > span')
                    .first(),
                'libellé de recherche'
            )
        ).height
    ).toBeLessThanOrEqual(1);
    await expect(searchInput(page)).toHaveAttribute('placeholder', /.+/);

    await page.setViewportSize(MEDIUM_CONSTRAINED);
    await settle(page);
    for (const id of ['create', 'refresh', 'filters'] as const) {
        const control = command(page, id);
        await expect(control.locator('[data-cmz-command-label]')).toBeHidden();
        await expect(control.locator('svg[aria-hidden="true"]')).toBeVisible();
        await expect(control).toHaveAttribute('title', /.+/);
        await expect(control).toHaveAccessibleName(/.+/);
        const controlBox = await box(control, `commande ${id}`);
        expect(controlBox.width).toBeGreaterThanOrEqual(48);
        expect(controlBox.height).toBeGreaterThanOrEqual(48);
        expect(controlBox.width).toBeLessThanOrEqual(56);
    }
});

test('rang : numérote depuis la pagination et ne rend aucune ligne interactive', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : l’en-tête de rang n’expose pas encore le nom accessible « Numéro de ligne ».'
    );
    await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);

    const header = page.locator('[data-cmz-id="row-rank-header"]');
    await expect(header).toHaveAccessibleName('Numéro de ligne');
    await expect(header).toContainText('#');
    expect(
        await page
            .locator('[data-cmz-id="users-table"] thead tr')
            .first()
            .locator('th')
            .first()
            .getAttribute('data-cmz-id')
    ).toBe('row-rank-header');
    const ranks = page.locator('[data-cmz-row-rank]');
    await expect(ranks).toHaveText(
        Array.from({ length: PAGE_SIZE }, (_, index) => String(index + 1))
    );

    await page.getByRole('button', { name: 'Page 2' }).click();
    await expect(ranks.first()).toHaveText(String(PAGE_SIZE + 1));
    await expect(ranks.last()).toHaveText(String(PAGE_SIZE * 2));
    await expect(
        page.locator('tbody tr[tabindex], tbody tr[role], tbody [onclick]')
    ).toHaveCount(0);
});

test('filtres appliqués : compteur et raccourcis actifs, sans ligne de chips intercalée', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : le compteur de filtres appliqués n’existe pas encore.'
    );
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await applyShortcut(page, requests, 'profile', 'profile-b');
    await applyShortcut(page, requests, 'status', 'active');

    await expect(command(page, 'filters')).toHaveAccessibleName('Filtres (2)');
    await expect(page.locator('[data-cmz-id="filter-count"]')).toHaveText('2');
    await expect(
        page.getByRole('region', { name: 'Filtres appliqués' })
    ).toHaveCount(0);
    await expect(shortcut(page, 'profile')).toHaveAttribute(
        'data-cmz-filter-active',
        'true'
    );
    await expect(shortcut(page, 'status')).toHaveAttribute(
        'data-cmz-filter-active',
        'true'
    );
    await expect(shortcut(page, 'role')).not.toHaveAttribute(
        'data-cmz-filter-active',
        'true'
    );
    // L'état actif ne repose pas sur la couleur seule : valeur visible et
    // épaisseur de bordure distincte.
    const borders = await Promise.all(
        (['profile', 'role'] as const).map((key) =>
            shortcut(page, key).evaluate((element) =>
                Number.parseFloat(getComputedStyle(element).borderTopWidth)
            )
        )
    );
    expect(borders[0]).toBeGreaterThan(borders[1]);

    // Retirer un filtre reste possible depuis son raccourci, en un seul GET.
    const before = requests.length;
    await shortcut(page, 'status').selectOption('');
    await expect.poll(() => requests.length).toBe(before + 1);
    await settle(page);
    expect(requests).toHaveLength(before + 1);
    await expect(command(page, 'filters')).toHaveAccessibleName('Filtres (1)');
});

for (const [label, viewport] of [
    ['Expanded', EXPANDED],
    ['Medium contraint', MEDIUM_CONSTRAINED],
] as const) {
    test(`${label} : panneau sans titre ni croix, ajout en tête, bascule et Échap`, async ({
        page,
    }) => {
        expectFailureWhileLegacy(
            'C5 : le panneau de filtres porte encore un titre « Filtres ».'
        );
        const requests = await installLayoutBackend(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        await applyShortcut(page, requests, 'status', 'active');
        const requestsBeforePanel = requests.length;

        const trigger = command(page, 'filters');
        await trigger.click();
        const filters = panel(page);
        await expect(filters).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(filters).toHaveRole('region');
        await expect(filters).toHaveAccessibleName('Filtres');
        await expect(filters).not.toHaveAttribute('aria-modal', 'true');
        await expect(
            filters.getByRole('heading', { name: 'Filtres' })
        ).toHaveCount(0);
        await expect(
            filters.getByRole('button', { name: 'Fermer les filtres' })
        ).toHaveCount(0);

        const [
            panelBox,
            addBox,
            blockBox,
            actionsBox,
            tableBox,
            railBox,
            toolsBox,
        ] = await Promise.all([
            box(filters, 'panneau'),
            box(filters.locator('[data-cmz-id="add-filter-trigger"]'), 'ajout'),
            box(
                filters.locator('[data-cmz-filter-block="status"]'),
                'bloc Statut'
            ),
            box(
                filters.locator('[data-cmz-id="filter-actions"]'),
                'actions du panneau'
            ),
            box(page.locator('[data-cmz-id="users-table"]'), 'tableau'),
            box(
                page.locator('[data-cmz-id="table-horizontal-scroll"]'),
                'rail'
            ),
            box(toolbar(page), 'barre'),
        ]);
        expect(bottom(addBox)).toBeLessThanOrEqual(blockBox.y);
        expect(bottom(blockBox)).toBeLessThanOrEqual(actionsBox.y + 1);
        expect(
            Math.abs(bottom(actionsBox) - bottom(panelBox))
        ).toBeLessThanOrEqual(1);
        const reset = await box(
            filters.getByRole('button', { name: 'Réinitialiser' }),
            'Réinitialiser'
        );
        const apply = await box(
            filters.getByRole('button', { name: 'Filtrer' }),
            'Filtrer'
        );
        expect(right(reset)).toBeLessThanOrEqual(apply.x);

        // Sous la barre, au-dessus du rail, ancré à droite de la surface.
        expect(Math.abs(panelBox.y - bottom(toolsBox))).toBeLessThanOrEqual(1);
        expect(Math.abs(panelBox.y - tableBox.y)).toBeLessThanOrEqual(1);
        expect(bottom(panelBox)).toBeLessThanOrEqual(railBox.y + 1);
        expect(right(railBox)).toBeLessThanOrEqual(panelBox.x + 1);
        expect(right(panelBox)).toBeLessThanOrEqual(right(tableBox) + 1);

        // La barre reste utilisable : le panneau n'est pas modal.
        await expect(command(page, 'create')).toBeEnabled();

        await trigger.click();
        await expect(filters).toHaveCount(0);
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await trigger.click();
        await expect(filters).toBeVisible();
        await filters.getByRole('radio', { name: 'Inactif' }).check();
        await page.keyboard.press('Escape');
        await expect(filters).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAccessibleName('Filtres (1)');
        await settle(page);
        expect(requests).toHaveLength(requestsBeforePanel);
    });
}

test('Compact : en-tête de collection, recherche pleine largeur, cartes puis bouton flottant', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : l’en-tête de collection n’est pas encore visible en Compact.'
    );
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);

    const title = page.locator('[data-cmz-id="table-title"]');
    const total = page.locator('[data-cmz-id="table-total"]');
    const refresh = command(page, 'refresh');
    const filters = command(page, 'filters');
    const search = page.locator('[data-cmz-id="table-search"]');
    const list = page.locator('[data-cmz-id="mobile-user-list"]');
    await expect(title).toBeVisible();
    await expect(total).toHaveText(String(TOTAL_USERS));

    const [toolsBox, titleBox, refreshBox, filtersBox, searchBox, listBox] =
        await Promise.all([
            box(toolbar(page), 'en-tête de collection'),
            box(title, 'titre'),
            box(refresh, 'rafraîchir'),
            box(filters, 'filtres'),
            box(search, 'recherche'),
            box(list, 'cartes'),
        ]);
    // Ligne 1 : titre et total, puis rafraîchir et filtres à droite.
    expect(right(titleBox)).toBeLessThanOrEqual(refreshBox.x);
    expect(right(refreshBox)).toBeLessThanOrEqual(filtersBox.x);
    expect(refreshBox.y).toBeLessThan(bottom(titleBox));
    expect(titleBox.y).toBeLessThan(bottom(refreshBox));
    expect(right(toolsBox) - right(filtersBox)).toBeLessThanOrEqual(1);
    for (const target of [refreshBox, filtersBox]) {
        expect(target.width).toBeGreaterThanOrEqual(48);
        expect(target.height).toBeGreaterThanOrEqual(48);
    }
    for (const control of [refresh, filters]) {
        await expect(control.locator('[data-cmz-command-label]')).toBeHidden();
    }
    // Ligne 2 : la recherche locale occupe seule toute la largeur utile.
    expect(searchBox.y).toBeGreaterThanOrEqual(
        Math.max(bottom(titleBox), bottom(filtersBox))
    );
    expect(Math.abs(searchBox.x - toolsBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(searchBox.width - toolsBox.width)).toBeLessThanOrEqual(1);
    expect(listBox.y).toBeGreaterThanOrEqual(bottom(searchBox));

    // L'ordre de tabulation suit l'ordre visuel de l'en-tête.
    expect(
        await page.evaluate(() => {
            const order = (selector: string) =>
                document.querySelector(selector) as HTMLElement;
            const refreshButton = order('[data-cmz-toolbar-action="refresh"]');
            const filterButton = order('[data-cmz-toolbar-action="filters"]');
            const input = order('[data-cmz-id="table-search"] input');
            return (
                Boolean(
                    refreshButton.compareDocumentPosition(filterButton) &
                    Node.DOCUMENT_POSITION_FOLLOWING
                ) &&
                Boolean(
                    filterButton.compareDocumentPosition(input) &
                    Node.DOCUMENT_POSITION_FOLLOWING
                )
            );
        })
    ).toBe(true);

    // Un seul total, autoritatif ; aucun compteur de cartes chargées.
    await expect(page.getByText(/affichés?/)).toHaveCount(0);
    await expect(
        page.getByText(String(TOTAL_USERS), { exact: true })
    ).toHaveCount(1);
    await expect(
        page.getByRole('region', { name: 'Filtres appliqués' })
    ).toHaveCount(0);

    // Bouton flottant unique, hors du flux, sans recouvrir la recherche.
    const create = command(page, 'create');
    const fabBox = await box(create, 'bouton flottant');
    // F-010 : ancré à l'écran, pas à un conteneur ; 16 px des bords droit et bas.
    expect(Math.abs(COMPACT.width - right(fabBox) - 16)).toBeLessThanOrEqual(1);
    expect(Math.abs(COMPACT.height - bottom(fabBox) - 16)).toBeLessThanOrEqual(
        1
    );
    expect(fabBox.y).toBeGreaterThan(bottom(searchBox));
    await expect(page.locator('[data-cmz-id="create-user"]')).toHaveCount(1);

    // Le compteur de filtres appliqués vit sur le déclencheur.
    await applyCompactStatus(page, requests);
    await expect(filters).toHaveAccessibleName('Filtres (1)');
    await expect(page.locator('[data-cmz-id="filter-count"]')).toHaveText('1');
    await expect(page.locator('[data-cmz-id="filter-count"]')).toBeVisible();
});

// Aucune autorité ne fixe la taille relative du titre de page ni sa distance à
// la barre : seule la structure des titres est jugée ici.
test('titres : un seul titre de page, placé avant celui de la collection, dans les trois classes', async ({
    page,
}) => {
    await installLayoutBackend(page);
    for (const layout of ['expanded', 'medium', 'compact'] as const) {
        await page.setViewportSize(VIEWPORTS[layout]);
        await openReadyPage(page);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect(
            page.getByRole('heading', {
                level: 1,
                name: 'Gestion des utilisateurs',
            })
        ).toBeVisible();
        const [headingBox, viewBox] = await Promise.all([
            box(page.locator('[data-cmz-id="page-heading"]'), 'titre de page'),
            box(toolbar(page), 'barre'),
        ]);
        expect(bottom(headingBox)).toBeLessThanOrEqual(viewBox.y);
    }
});

async function reach(
    page: Page,
    requests: string[],
    example: BoundExample
): Promise<void> {
    if (example.layoutClass === 'compact') {
        if (example.state === 'search-active') {
            await searchInput(page).fill('alpha');
            const searches = () =>
                requests.filter((search) => search.includes('search=alpha'))
                    .length;
            const before = searches();
            await searchInput(page).press('Enter');
            await expect.poll(searches).toBe(before + 1);
            return;
        }
        await applyCompactStatus(page, requests);
        if (example.state === 'filters-closed') return;
        await command(page, 'filters').click();
        await expect(panel(page)).toBeVisible();
        if (example.state === 'filter-detail') {
            await panel(page)
                .locator('[data-cmz-filter-summary="status"]')
                .click();
        }
        return;
    }
    await applyShortcut(page, requests, 'profile', 'profile-b');
    await applyShortcut(page, requests, 'status', 'active');
    if (example.state === 'filters-open') {
        await command(page, 'filters').click();
        await expect(panel(page)).toBeVisible();
    }
}

async function capture(
    page: Page,
    testInfo: TestInfo,
    example: BoundExample
): Promise<void> {
    const directory = resolve(
        testInfo.project.outputDir,
        'layout-binding',
        example.setId
    );
    mkdirSync(directory, { recursive: true });
    const path = resolve(directory, `${example.sourceId}.actual.png`);
    await page.screenshot({ path, animations: 'disabled', caret: 'hide' });
    await testInfo.attach(`${example.setId}/${example.sourceId}`, {
        path,
        contentType: 'image/png',
    });
}

for (const example of boundExamples) {
    test(`rendu lié — ${example.setId} / ${example.sourceId}`, async ({
        page,
    }, testInfo) => {
        const requests = await installLayoutBackend(page);
        await page.setViewportSize(example.viewport);
        await openReadyPage(page);
        await reach(page, requests, example);
        await settle(page);

        // Une région conservée par la liaison doit exister dans le rendu.
        const regionProbes: Record<string, Locator> = {
            'table-toolbar': toolbar(page),
            'data-grid': page.locator('[data-cmz-id="users-table"] table'),
            'filter-panel': panel(page),
            'horizontal-scroll-rail': page.locator(
                '[data-cmz-id="table-horizontal-scroll"]'
            ),
            'collection-header': page.locator('[data-cmz-id="table-title"]'),
            'search-controls': page.locator('[data-cmz-id="table-search"]'),
            'card-list': page.locator('[data-cmz-id="mobile-user-list"]'),
            'floating-action': command(page, 'create'),
            'bottom-sheet': panel(page),
            'modal-backdrop': page.locator('[data-cmz-id="filter-backdrop"]'),
        };
        for (const region of example.regions) {
            const probe = regionProbes[region];
            expect(probe, `région sans sonde : ${region}`).toBeTruthy();
            await expect(probe, region).toHaveCount(1);
        }
        expect(
            await page.evaluate(
                () =>
                    document.documentElement.scrollWidth <=
                    document.documentElement.clientWidth + 1
            )
        ).toBe(true);
        await capture(page, testInfo, example);
    });
}
