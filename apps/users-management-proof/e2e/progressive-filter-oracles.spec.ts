import { expect, test, type Locator, type Page } from '@playwright/test';

import {
    COMPACT,
    EXPANDED,
    MEDIUM,
    RESPONSIVE_QUIET_WINDOW_MS,
    expectOnlyOneUsersGet,
    installFilterOracleBackend,
    observeUsersRequests,
    openReadyPage,
    requireBox,
    waitForResponsiveLayout,
} from './filter-oracle.support';
import { expectFailureWhileLegacy } from './c5-realization-baseline.support';

function filterTrigger(page: Page): Locator {
    return page.getByRole('button', { name: /^Filtres(?: \(\d+\))?$/ });
}

async function openFilters(page: Page): Promise<Locator> {
    await filterTrigger(page).click();
    const panel = page.locator('#user-filter-panel');
    await expect(panel).toBeVisible();
    return panel;
}

async function expectUsersGetCountStable(
    requests: string[],
    expected: number
): Promise<void> {
    await pageQuietWindow();
    expect(requests).toHaveLength(expected);
}

async function pageQuietWindow(): Promise<void> {
    await new Promise((resolve) =>
        setTimeout(resolve, RESPONSIVE_QUIET_WINDOW_MS)
    );
}

function tableWorkspace(page: Page): Locator {
    return page.locator('[data-cmz-id="users-table-workspace"]');
}

function shortcut(page: Page, key: 'profile' | 'role' | 'status'): Locator {
    return page.locator(`[data-cmz-filter-shortcut="${key}"]`);
}

function filterBlock(
    panel: Locator,
    key: 'profile' | 'role' | 'status'
): Locator {
    return panel.locator(`[data-cmz-filter-block="${key}"]`);
}

async function addFilter(
    panel: Locator,
    label: 'Profil' | 'Rôle' | 'Statut'
): Promise<void> {
    await panel.getByRole('button', { name: 'Ajouter un filtre' }).click();
    const available = panel.locator('[data-cmz-id="available-filters"]');
    await expect(available).toBeVisible();
    await available.getByRole('menuitem', { name: label, exact: true }).click();
    const key =
        label === 'Profil' ? 'profile' : label === 'Rôle' ? 'role' : 'status';
    await expect(filterBlock(panel, key)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await installFilterOracleBackend(page);
});

test('Medium/Expanded : intègre recherche, Filtres et les trois seuls raccourcis contractuels au tableau', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);

    const workspace = tableWorkspace(page);
    const tools = workspace.locator('[data-cmz-id="table-tools"]');
    const shortcuts = workspace.locator(
        '[data-cmz-id="column-filter-shortcuts"]'
    );
    await expect(tools.getByLabel('Rechercher un utilisateur')).toBeVisible();
    await expect(tools.getByRole('button', { name: 'Filtres' })).toBeVisible();
    await expect(shortcuts).toBeVisible();

    await expect(shortcut(page, 'profile')).toHaveAccessibleName(
        'Filtrer par Profil'
    );
    await expect(shortcut(page, 'role')).toHaveAccessibleName(
        'Filtrer par Rôle'
    );
    await expect(shortcut(page, 'status')).toHaveAccessibleName(
        'Filtrer par Statut'
    );
    await expect(shortcuts.locator('[data-cmz-filter-shortcut]')).toHaveCount(
        3
    );
    for (const forbidden of ['Nom', 'Prénom', 'Email', 'Mise à jour']) {
        await expect(
            workspace.getByLabel(`Filtrer par ${forbidden}`)
        ).toHaveCount(0);
    }
});

test('raccourci de colonne : applique côté serveur, revient en page 1 et émet exactement un GET', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);

    const countBefore = requests.length;
    await shortcut(page, 'role').selectOption('agent');
    await expectOnlyOneUsersGet(requests, countBefore);
    const request = new URL(requests.at(-1) ?? '', 'https://example.invalid');
    expect(request.searchParams.get('role')).toBe('agent');
    expect(request.searchParams.get('page')).toBe('1');
    await expect(page.locator('#user-filter-panel')).toHaveCount(0);
});

test('Medium : superpose un panneau non modal sans redimensionner les colonnes ni perdre le scroll horizontal', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const table = page.locator('[data-cmz-id="users-table"]');
    // ADR-0098 / F-003 : l'ancienne attente « scrollWidth inchangé » protégeait
    // le défaut (dernière colonne masquée par le panneau). L'invariant utile
    // est la stabilité des colonnes et de la position courante ; la portée de
    // défilement, elle, doit s'allonger de la largeur du panneau.
    const measure = (element: Element) => ({
        clientWidth: element.clientWidth,
        scrollLeft: element.scrollLeft,
        columnWidths: [
            ...element.querySelectorAll('thead tr:first-child th'),
        ].map((cell) => cell.getBoundingClientRect().width),
    });
    await table.evaluate((element) => {
        element.scrollLeft = Math.min(
            80,
            element.scrollWidth - element.clientWidth
        );
    });
    const before = await table.evaluate(measure);

    const panel = await openFilters(page);
    await expect(panel).not.toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await expect(page.locator('[data-cmz-id="filter-backdrop"]')).toHaveCount(
        0
    );

    expect(await table.evaluate(measure)).toEqual(before);

    const [workspaceBox, panelBox, toolsBox] = await Promise.all([
        tableWorkspace(page).boundingBox(),
        panel.boundingBox(),
        tableWorkspace(page)
            .locator('[data-cmz-id="table-tools"]')
            .boundingBox(),
    ]);
    const workspace = requireBox(workspaceBox, 'surface tabulaire Medium');
    const filters = requireBox(panelBox, 'panneau Medium');
    const tools = requireBox(toolsBox, 'barre interne Medium');
    expect(filters.x).toBeGreaterThan(workspace.x);
    expect(filters.x + filters.width).toBeLessThanOrEqual(
        workspace.x + workspace.width + 1
    );
    expect(filters.y).toBeGreaterThanOrEqual(tools.y + tools.height - 1);
});

test('Expanded : superpose le panneau dans la surface sans déplacer la table et masque les contrôles recouverts du clavier', async ({
    page,
}) => {
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    const table = page.locator('[data-cmz-id="users-table"]');
    const tableBefore = requireBox(await table.boundingBox(), 'table Expanded');
    const panel = await openFilters(page);

    const [tableAfterBox, panelBox] = await Promise.all([
        table.boundingBox(),
        panel.boundingBox(),
    ]);
    expect(requireBox(tableAfterBox, 'table Expanded ouverte')).toEqual(
        tableBefore
    );
    const filters = requireBox(panelBox, 'panneau Expanded');
    expect(filters.x).toBeLessThan(tableBefore.x + tableBefore.width);
    expect(filters.x + filters.width).toBeLessThanOrEqual(
        tableBefore.x + tableBefore.width + 1
    );

    const coveredShortcuts = await page
        .locator('[data-cmz-filter-shortcut]')
        .evaluateAll(
            (controls, panelRect) =>
                controls
                    .filter((control) => {
                        const rect = control.getBoundingClientRect();
                        return (
                            rect.left < panelRect.right &&
                            rect.right > panelRect.left &&
                            rect.top < panelRect.bottom &&
                            rect.bottom > panelRect.top
                        );
                    })
                    .map((control) => ({
                        inert: !!control.closest('[inert]'),
                        tabIndex: (control as HTMLElement).tabIndex,
                        disabled:
                            (control as HTMLInputElement).disabled === true,
                    })),
            {
                left: filters.x,
                right: filters.x + filters.width,
                top: filters.y,
                bottom: filters.y + filters.height,
            }
        );
    expect(coveredShortcuts.length).toBeGreaterThan(0);
    expect(
        coveredShortcuts.every(
            ({ inert, tabIndex, disabled }) => inert || disabled || tabIndex < 0
        )
    ).toBe(true);
});

for (const [label, viewport] of [
    ['Medium', MEDIUM],
    ['Expanded', EXPANDED],
] as const) {
    test(`${label} : au défilement maximal, la dernière colonne s’arrête au bord gauche du panneau`, async ({
        page,
    }) => {
        expectFailureWhileLegacy(
            'C5 : au défilement maximal, la dernière colonne ne s’arrête pas encore au bord gauche du panneau.'
        );
        // F-003 / P-003 — clause d'autorité : « la limite droite du contenu
        // défilant devient le bord gauche du panneau ».
        const requests = observeUsersRequests(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        const table = page.locator('[data-cmz-id="users-table"]');
        const lastCell = table.locator('tbody tr').first().locator('td').last();
        const scrollRange = () =>
            table.evaluate(
                (element) => element.scrollWidth - element.clientWidth
            );
        const closedRange = await scrollRange();

        const panel = await openFilters(page);
        const countAfterOpen = requests.length;
        await table.evaluate((element) => {
            element.scrollLeft = element.scrollWidth - element.clientWidth;
        });
        const [cellBox, panelBox] = await Promise.all([
            lastCell.boundingBox(),
            panel.boundingBox(),
        ]);
        const cell = requireBox(cellBox, `dernière cellule ${label}`);
        const filters = requireBox(panelBox, `panneau ${label}`);
        expect(Math.abs(cell.x + cell.width - filters.x)).toBeLessThanOrEqual(
            2
        );

        // Panneau fermé : aucune réserve de défilement ne subsiste.
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        expect(await scrollRange()).toBe(closedRange);
        await expectUsersGetCountStable(requests, countAfterOpen);
    });
}

test('menu Ajouter : s’ouvre, se parcourt et se ferme entièrement au clavier', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : l’ouverture du menu Ajouter ne place pas encore le focus sur son premier élément.'
    );
    // F-005 / P-004 : le changement d'Échap touche ce menu ; son clavier doit
    // être prouvé, pas supposé.
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    const countAfterOpen = requests.length;
    const addTrigger = panel.getByRole('button', { name: 'Ajouter un filtre' });
    const menu = page.locator('[data-cmz-id="available-filters"]');
    const item = (name: string) =>
        menu.getByRole('menuitem', { name, exact: true });

    await addTrigger.focus();
    await expect(addTrigger).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await expect(addTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(item('Profil')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(item('Rôle')).toBeFocused();
    await page.keyboard.press('s');
    await expect(item('Statut')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(addTrigger).toBeFocused();
    await expect(addTrigger).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press('ArrowDown');
    await expect(item('Profil')).toBeFocused();
    await page.keyboard.press('End');
    await expect(item('Statut')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(
        filterBlock(panel, 'status').getByRole('radio', { name: 'Tous' })
    ).toBeFocused();
    await expectUsersGetCountStable(requests, countAfterOpen);
});

test('passage en Compact : le menu Ajouter ne survit pas et un seul Échap ferme la sheet', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : au passage en Compact, le focus ne reste pas encore dans la sheet modale.'
    );
    // F-006 : un état de menu resté ouvert sans menu dans le DOM absorbait le
    // premier Échap.
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    await panel.getByRole('button', { name: 'Ajouter un filtre' }).click();
    const menu = page.locator('[data-cmz-id="available-filters"]');
    await expect(menu).toBeVisible();
    const countBeforeResize = requests.length;

    await page.setViewportSize(COMPACT);
    await waitForResponsiveLayout(page);
    await expect(menu).toHaveCount(0);
    const sheet = page.locator('#user-filter-panel');
    await expect(sheet).toHaveRole('dialog');
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    // Une surface modale garde le focus : il ne reste pas sur un nœud retiré.
    expect(
        await sheet.evaluate((element) =>
            element.contains(document.activeElement)
        )
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(filterTrigger(page)).toBeFocused();
    await expectUsersGetCountStable(requests, countBeforeResize);
});

test('blocs progressifs : ajoute seulement un critère disponible, l’ouvre, le focalise et reste silencieux', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    const countBefore = requests.length;

    await expect(panel.locator('[data-cmz-filter-block]')).toHaveCount(0);
    await addFilter(panel, 'Statut');
    const block = filterBlock(panel, 'status');
    await expect(block).toBeVisible();
    await expect(block).toHaveAttribute('data-cmz-expanded', 'true');
    await expect(
        block.locator('[data-cmz-filter-control]').first()
    ).toBeFocused();

    await panel.getByRole('button', { name: 'Ajouter un filtre' }).click();
    const available = panel.locator('[data-cmz-id="available-filters"]');
    await expect(
        available.getByRole('menuitem', { name: 'Statut', exact: true })
    ).toHaveCount(0);
    await expect(
        available.getByRole('menuitem', { name: /^(Profil|Rôle)$/ })
    ).toHaveCount(2);
    await expectUsersGetCountStable(requests, countBefore);
});

test('brouillon : replie, supprime avec un focus déterministe et publie au plus un GET seulement sur Filtrer', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : les filtres appliqués sont encore rendus dans une région distincte « Filtres appliqués ».'
    );
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    const countAfterOpen = requests.length;

    await addFilter(panel, 'Rôle');
    const role = filterBlock(panel, 'role');
    await role
        .getByRole('combobox', { name: 'Rôle', exact: true })
        .selectOption('supervisor');
    await addFilter(panel, 'Statut');
    const status = filterBlock(panel, 'status');
    await status.getByRole('radio', { name: 'Inactif' }).check();
    await expect(
        page.getByRole('region', { name: 'Filtres appliqués' })
    ).toHaveCount(0);
    await expectUsersGetCountStable(requests, countAfterOpen);

    await role.getByRole('button', { name: 'Replier le filtre Rôle' }).click();
    await expect(role).toHaveAttribute('data-cmz-expanded', 'false');
    await status
        .getByRole('button', { name: 'Retirer le filtre Statut' })
        .click();
    await expect(status).toHaveCount(0);
    await expect(
        role.getByRole('button', { name: 'Déplier le filtre Rôle' })
    ).toBeFocused();
    await expectUsersGetCountStable(requests, countAfterOpen);

    const countBeforeApply = requests.length;
    await panel.getByRole('button', { name: 'Filtrer' }).click();
    await expectOnlyOneUsersGet(requests, countBeforeApply);
    const request = new URL(requests.at(-1) ?? '', 'https://example.invalid');
    expect(request.searchParams.get('role')).toBe('supervisor');
    expect(request.searchParams.has('is_active')).toBe(false);
    // ADR-0098 : l'état appliqué se lit sur le déclencheur et le raccourci de
    // colonne ; aucune ligne de chips ne s'intercale sous la barre.
    await expect(
        page.getByRole('region', { name: 'Filtres appliqués' })
    ).toHaveCount(0);
    await expect(shortcut(page, 'role')).toHaveValue('supervisor');
    await expect(
        page.getByRole('button', { name: /^Filtres(?: \(\d+\))?$/ })
    ).toHaveAccessibleName('Filtres (1)');
});

test('fermeture : abandonne le brouillon en Medium et Expanded sans requête', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : le panneau porte encore un bouton « Fermer les filtres ».'
    );
    for (const viewport of [MEDIUM, EXPANDED]) {
        const requests = observeUsersRequests(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);

        await shortcut(page, 'role').selectOption('agent');
        await expectOnlyOneUsersGet(requests, 1);
        let panel = await openFilters(page);
        const countAfterOpen = requests.length;
        const role = filterBlock(panel, 'role');
        const roleControl = role.getByRole('combobox', {
            name: 'Rôle',
            exact: true,
        });
        await expect(roleControl).toHaveValue('agent');
        await roleControl.selectOption('supervisor');
        // ADR-0098 : le panneau Medium/Expanded n'a ni titre ni croix ; ses
        // sorties sont Échap et la bascule du déclencheur.
        await expect(
            panel.getByRole('button', { name: 'Fermer les filtres' })
        ).toHaveCount(0);
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        await expectUsersGetCountStable(requests, countAfterOpen);

        panel = await openFilters(page);
        await expect(
            filterBlock(panel, 'role').getByRole('combobox', {
                name: 'Rôle',
                exact: true,
            })
        ).toHaveValue('agent');
        await page
            .getByRole('button', { name: /^Filtres(?: \(\d+\))?$/ })
            .click();
        await expect(panel).toHaveCount(0);
        await expectUsersGetCountStable(requests, countAfterOpen);
    }
});

test('Échap ferme le menu Ajouter avant le panneau et restitue chaque focus', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : un second Échap ne ferme pas encore le panneau de filtres.'
    );
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const trigger = filterTrigger(page);
    const panel = await openFilters(page);
    const addTrigger = panel.getByRole('button', {
        name: 'Ajouter un filtre',
    });
    await addTrigger.click();
    const menu = page.locator('[data-cmz-id="available-filters"]');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(addTrigger).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('resize Medium ↔ Expanded : conserve le même contrôle, le brouillon, le focus, le scroll et le silence réseau', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    await addFilter(panel, 'Profil');
    const profile = filterBlock(panel, 'profile').getByRole('combobox', {
        name: 'Profil',
        exact: true,
    });
    await profile.selectOption('profile-b');
    await profile.focus();
    await profile.evaluate((element) => {
        (
            window as typeof window & {
                __cmzProgressiveFilterControl?: Element;
            }
        ).__cmzProgressiveFilterControl = element;
    });
    const table = page.locator('[data-cmz-id="users-table"]');
    const scrollBefore = await table.evaluate((element) => {
        element.scrollLeft = Math.min(
            72,
            element.scrollWidth - element.clientWidth
        );
        return element.scrollLeft;
    });
    const requestsBeforeResize = [...requests];

    await page.setViewportSize(EXPANDED);
    await waitForResponsiveLayout(page);
    const expandedProfile = filterBlock(
        page.locator('#user-filter-panel'),
        'profile'
    ).getByRole('combobox', { name: 'Profil', exact: true });
    expect(
        await expandedProfile.evaluate(
            (element) =>
                element ===
                (
                    window as typeof window & {
                        __cmzProgressiveFilterControl?: Element;
                    }
                ).__cmzProgressiveFilterControl
        )
    ).toBe(true);
    await expect(expandedProfile).toHaveValue('profile-b');
    await expect(expandedProfile).toBeFocused();
    expect(await table.evaluate((element) => element.scrollLeft)).toBe(
        scrollBefore
    );
    expect(requests).toEqual(requestsBeforeResize);

    await page.setViewportSize(MEDIUM);
    await waitForResponsiveLayout(page);
    await expect(expandedProfile).toHaveValue('profile-b');
    await expect(expandedProfile).toBeFocused();
    expect(requests).toEqual(requestsBeforeResize);
});

test('hauteur courte et densité : seule la pile défile, le pied reste visible sans débordement horizontal', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : le panneau conserve encore un en-tête dédié.'
    );
    const requests = observeUsersRequests(page);
    await page.setViewportSize({ width: MEDIUM.width, height: 520 });
    await openReadyPage(page);
    const panel = await openFilters(page);
    const countAfterOpen = requests.length;
    for (const label of ['Profil', 'Rôle', 'Statut'] as const) {
        await addFilter(panel, label);
    }

    const blocks = panel.locator('[data-cmz-id="filter-blocks"]');
    await blocks.evaluate((container) => {
        const sources = [...container.children];
        if (sources.length !== 3) {
            throw new Error(
                `Trois blocs contractuels sont requis avant le stress ; reçu ${sources.length}.`
            );
        }
        for (let copy = 1; copy < 5; copy += 1) {
            for (const source of sources) {
                const clone = source.cloneNode(true) as HTMLElement;
                clone.setAttribute('aria-hidden', 'true');
                clone.setAttribute('inert', '');
                clone.dataset.cmzStressCopy = String(copy);
                for (const identified of clone.querySelectorAll('[id]')) {
                    identified.removeAttribute('id');
                }
                for (const control of clone.querySelectorAll(
                    'button, input, select'
                )) {
                    control.removeAttribute('name');
                    control.setAttribute('tabindex', '-1');
                }
                container.append(clone);
            }
        }
    });

    const body = panel.locator('[data-cmz-id="filter-body"]');
    const footer = panel.locator('[data-cmz-id="filter-actions"]');
    // ADR-0098 : aucun en-tête visible en Medium/Expanded.
    await expect(panel.locator('.filter-panel-header')).toHaveCount(0);
    const metrics = await body.evaluate((element) => ({
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(
        await panel.evaluate((element) => {
            const bodyElement = element.querySelector(
                '[data-cmz-id="filter-body"]'
            );
            const footerElement = element.querySelector(
                '[data-cmz-id="filter-actions"]'
            );
            return (
                !!bodyElement &&
                !!footerElement &&
                !bodyElement.contains(footerElement)
            );
        })
    ).toBe(true);

    const [panelBox, bodyBox, footerBox] = await Promise.all([
        panel.boundingBox(),
        body.boundingBox(),
        footer.boundingBox(),
    ]);
    const outer = requireBox(panelBox, 'panneau dense');
    const stack = requireBox(bodyBox, 'pile dense');
    const actions = requireBox(footerBox, 'footer dense');
    expect(stack.y).toBeGreaterThanOrEqual(outer.y - 1);
    expect(stack.y + stack.height).toBeLessThanOrEqual(actions.y + 1);
    expect(actions.y + actions.height).toBeLessThanOrEqual(
        outer.y + outer.height + 1
    );
    await expect(panel.getByRole('button', { name: 'Filtrer' })).toBeVisible();
    await expectUsersGetCountStable(requests, countAfterOpen);
});
