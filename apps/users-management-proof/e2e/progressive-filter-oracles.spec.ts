import { expect, test, type Locator, type Page } from '@playwright/test';

import {
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

async function markLegacyDetachedToolbar(page: Page): Promise<void> {
    const legacy = await page.evaluate(() => {
        const form = document.querySelector('main > form.filters');
        const table = document.querySelector('[data-cmz-id="users-table"]');
        return (
            form instanceof HTMLFormElement &&
            table instanceof HTMLElement &&
            !document.querySelector('[data-cmz-id="users-table-workspace"]') &&
            form.querySelectorAll('input[type="search"]').length === 1 &&
            form.querySelectorAll('button.filter-toggle').length === 1 &&
            !document.querySelector('[data-cmz-filter-shortcut]')
        );
    });
    const reason =
        'ADAPT-8d : la signature historique place encore recherche et déclencheur au-dessus de la surface tabulaire et ne rend aucun raccourci de colonne.';
    test.fail(legacy, reason);
    if (legacy) expect(legacy, reason).toBe(false);
}

async function markLegacyGroupedPanel(panel: Locator): Promise<void> {
    const legacy = await panel.evaluate((element) => {
        const groups = element.querySelector('[data-cmz-id="filter-groups"]');
        const fieldset = groups?.firstElementChild;
        const labels = [...(fieldset?.querySelectorAll('label > span') ?? [])]
            .map((label) => label.textContent?.trim())
            .filter(Boolean);
        const actions = [
            ...element.querySelectorAll(
                '[data-cmz-id="filter-actions"] > button'
            ),
        ].map((button) => button.textContent?.trim());
        return (
            groups?.children.length === 1 &&
            fieldset?.tagName === 'FIELDSET' &&
            fieldset.querySelectorAll('select').length === 3 &&
            labels.join('|') === 'Profil|Rôle|Statut' &&
            actions.join('|') === 'Réinitialiser|Appliquer' &&
            ![...element.querySelectorAll('button')].some(
                (button) => button.textContent?.trim() === 'Ajouter un filtre'
            ) &&
            !element.querySelector('[data-cmz-filter-block]')
        );
    });
    const reason =
        'ADAPT-8d : la signature historique expose encore les trois critères simultanément dans un fieldset, sans blocs progressifs.';
    test.fail(legacy, reason);
    if (legacy) expect(legacy, reason).toBe(false);
}

async function markLegacyMediumModal(panel: Locator): Promise<void> {
    const legacy = await panel.evaluate((element) => {
        const main = document.querySelector('main');
        return (
            element.getAttribute('role') === 'dialog' &&
            element.getAttribute('aria-modal') === 'true' &&
            main?.hasAttribute('inert') === true &&
            !!document.querySelector('[data-cmz-id="filter-backdrop"]')
        );
    });
    const reason =
        'ADAPT-8d : la signature historique Medium reste un side sheet modal avec backdrop et inert sur la liste.';
    test.fail(legacy, reason);
    if (legacy) expect(legacy, reason).toBe(false);
}

async function markLegacyExpandedAdjacent(panel: Locator): Promise<void> {
    const legacy = await panel.evaluate((element) => {
        const main = document.querySelector('main');
        if (!(main instanceof HTMLElement)) return false;
        const mainBox = main.getBoundingClientRect();
        const panelBox = element.getBoundingClientRect();
        return (
            element.getAttribute('role') === 'complementary' &&
            mainBox.right <= panelBox.left + 1
        );
    });
    const reason =
        'ADAPT-8d : la signature historique Expanded réduit la liste pour placer un pane adjacent au lieu de superposer le panneau dans le tableau.';
    test.fail(legacy, reason);
    if (legacy) expect(legacy, reason).toBe(false);
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
}

test.beforeEach(async ({ page }) => {
    await installFilterOracleBackend(page);
});

test('Medium/Expanded : intègre recherche, Filtres et les trois seuls raccourcis contractuels au tableau', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    await markLegacyDetachedToolbar(page);

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
    await markLegacyDetachedToolbar(page);

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
    const before = await table.evaluate((element) => {
        element.scrollLeft = Math.min(
            80,
            element.scrollWidth - element.clientWidth
        );
        return {
            clientWidth: element.clientWidth,
            scrollLeft: element.scrollLeft,
            scrollWidth: element.scrollWidth,
        };
    });

    const panel = await openFilters(page);
    await markLegacyMediumModal(panel);
    await expect(panel).not.toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await expect(page.locator('[data-cmz-id="filter-backdrop"]')).toHaveCount(
        0
    );

    const after = await table.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollLeft: element.scrollLeft,
        scrollWidth: element.scrollWidth,
    }));
    expect(after).toEqual(before);

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
    await markLegacyExpandedAdjacent(panel);

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

test('blocs progressifs : ajoute seulement un critère disponible, l’ouvre, le focalise et reste silencieux', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    await markLegacyGroupedPanel(panel);
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
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    await markLegacyGroupedPanel(panel);
    const countAfterOpen = requests.length;

    await addFilter(panel, 'Rôle');
    const role = filterBlock(panel, 'role');
    await role.getByLabel('Rôle').selectOption('supervisor');
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
    await expect(
        page.getByRole('button', {
            name: 'Retirer le filtre Rôle : Superviseur',
        })
    ).toBeVisible();
});

test('fermeture : abandonne le brouillon en Medium et Expanded sans requête', async ({
    page,
}) => {
    for (const viewport of [MEDIUM, EXPANDED]) {
        const requests = observeUsersRequests(page);
        await page.setViewportSize(viewport);
        await openReadyPage(page);
        await markLegacyDetachedToolbar(page);

        await shortcut(page, 'role').selectOption('agent');
        await expectOnlyOneUsersGet(requests, 1);
        let panel = await openFilters(page);
        const countAfterOpen = requests.length;
        const role = filterBlock(panel, 'role');
        await expect(role.getByLabel('Rôle')).toHaveValue('agent');
        await role.getByLabel('Rôle').selectOption('supervisor');
        await panel.getByRole('button', { name: 'Fermer les filtres' }).click();
        await expectUsersGetCountStable(requests, countAfterOpen);

        panel = await openFilters(page);
        await expect(filterBlock(panel, 'role').getByLabel('Rôle')).toHaveValue(
            'agent'
        );
        await panel.getByRole('button', { name: 'Fermer les filtres' }).click();
    }
});

test('resize Medium ↔ Expanded : conserve le même contrôle, le brouillon, le focus, le scroll et le silence réseau', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const panel = await openFilters(page);
    await markLegacyGroupedPanel(panel);
    await addFilter(panel, 'Profil');
    const profile = filterBlock(panel, 'profile').getByLabel('Profil');
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
    ).getByLabel('Profil');
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

test('hauteur courte et densité : seule la pile défile, header/footer restent visibles sans débordement horizontal', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize({ width: MEDIUM.width, height: 520 });
    await openReadyPage(page);
    const panel = await openFilters(page);
    await markLegacyGroupedPanel(panel);
    const countAfterOpen = requests.length;
    for (const label of ['Profil', 'Rôle', 'Statut'] as const) {
        await addFilter(panel, label);
    }

    const blocks = panel.locator('[data-cmz-id="filter-blocks"]');
    await blocks.evaluate((container) => {
        const sources = [...container.children];
        if (sources.length !== 3) {
            throw new Error(
                'Trois blocs contractuels sont requis avant le stress.'
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
    const header = panel.locator('.filter-panel-header');
    const footer = panel.locator('[data-cmz-id="filter-actions"]');
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
            const headerElement = element.querySelector('.filter-panel-header');
            const footerElement = element.querySelector(
                '[data-cmz-id="filter-actions"]'
            );
            return (
                !!bodyElement &&
                !!headerElement &&
                !!footerElement &&
                !bodyElement.contains(headerElement) &&
                !bodyElement.contains(footerElement)
            );
        })
    ).toBe(true);

    const [panelBox, headerBox, footerBox] = await Promise.all([
        panel.boundingBox(),
        header.boundingBox(),
        footer.boundingBox(),
    ]);
    const outer = requireBox(panelBox, 'panneau dense');
    const heading = requireBox(headerBox, 'header dense');
    const actions = requireBox(footerBox, 'footer dense');
    expect(heading.y).toBeGreaterThanOrEqual(outer.y - 1);
    expect(actions.y + actions.height).toBeLessThanOrEqual(
        outer.y + outer.height + 1
    );
    await expect(panel.getByRole('button', { name: 'Filtrer' })).toBeVisible();
    await expectUsersGetCountStable(requests, countAfterOpen);
});
