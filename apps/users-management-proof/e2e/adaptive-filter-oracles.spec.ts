import { expect, test, type Locator, type Page } from '@playwright/test';

import {
    COMPACT,
    EXPANDED,
    EXPANDED_MIN_HEIGHT,
    EXPANDED_MIN_WIDTH,
    MEDIUM,
    expectOnlyOneUsersGet,
    installFilterOracleBackend,
    observeUsersRequests,
    openReadyPage,
    requireBox,
    waitForResponsiveLayout,
} from './filter-oracle.support';

async function markLegacyInlineFiltersAsExpectedFailure(
    page: Page
): Promise<void> {
    const legacyInlineFilters = await page
        .locator('#secondary-user-filters')
        .evaluate(
            (element) =>
                element.parentElement?.matches('form.filters') === true &&
                !element.hasAttribute('role') &&
                !element.hasAttribute('aria-modal')
        );

    test.fail(
        legacyInlineFilters,
        'ADAPT-6 : la signature historique exacte rend encore les filtres secondaires dans le formulaire de liste, sans panneau adaptatif.'
    );
}

function filterTrigger(page: Page): Locator {
    return page.getByRole('button', { name: /^Filtres(?: \(\d+\))?$/ });
}

async function openTemporaryFilters(page: Page): Promise<Locator> {
    const trigger = filterTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 2_000 });
    await trigger.click();
    const dialog = page.locator('#user-filter-panel');
    await expect(dialog).toBeVisible({ timeout: 2_000 });
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAccessibleName('Filtres');
    return dialog;
}

async function openDesktopFilters(page: Page): Promise<Locator> {
    const trigger = filterTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 2_000 });
    await trigger.click();
    const panel = page.locator('#user-filter-panel');
    await expect(panel).toBeVisible({ timeout: 2_000 });
    await expect(panel).toHaveAccessibleName('Filtres');
    return panel;
}

async function addDesktopFilterIfNeeded(
    panel: Locator,
    label: 'Profil' | 'Rôle' | 'Statut'
): Promise<void> {
    const add = panel.getByRole('button', { name: 'Ajouter un filtre' });
    if ((await add.count()) === 0) return;
    await add.click();
    await panel
        .locator('[data-cmz-id="available-filters"]')
        .getByRole('menuitem', { name: label, exact: true })
        .click();
    const key =
        label === 'Profil' ? 'profile' : label === 'Rôle' ? 'role' : 'status';
    await expect(
        panel.locator(`[data-cmz-filter-block="${key}"]`)
    ).toBeVisible();
}

async function markLegacyCompactFilterA11yAsExpectedFailure(
    panel: Locator
): Promise<void> {
    const legacyConstantName = await panel.evaluate(
        (element) =>
            element.getAttribute('aria-label') === 'Filtres' &&
            !element.hasAttribute('aria-labelledby')
    );

    test.fail(
        legacyConstantName,
        'ADAPT-7 : le détail compact conserve encore le nom accessible constant « Filtres » et ne garantit pas le transfert de focus.'
    );
}

async function expectUniqueIds(page: Page): Promise<void> {
    const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
        const counts = new Map<string, number>();
        for (const element of elements) {
            counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
        }
        return [...counts.entries()]
            .filter(([, count]) => count > 1)
            .map(([id]) => id);
    });
    expect(duplicateIds).toEqual([]);
}

test.beforeEach(async ({ page }) => {
    await installFilterOracleBackend(page);
});

test('compact : rend un unique bottom sheet, son sommaire puis le détail dans le même dialogue', async ({
    page,
}) => {
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const search = page.getByLabel('Rechercher un utilisateur');
    const dialog = await openTemporaryFilters(page);
    await expect(search).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByRole('dialog')).toHaveCount(1);

    const dialogBox = requireBox(
        await dialog.boundingBox(),
        'bottom sheet compact'
    );
    expect(dialogBox.height).toBeLessThanOrEqual(COMPACT.height * 0.8 + 1);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(
        COMPACT.height + 1
    );

    for (const label of ['Profil', 'Rôle', 'Statut']) {
        await expect(
            dialog.getByRole('button', { name: new RegExp(`^${label}\\b`) })
        ).toBeVisible();
    }

    const statusSummary = dialog.getByRole('button', { name: /^Statut\b/ });
    await statusSummary.focus();
    await statusSummary.click();
    await markLegacyCompactFilterA11yAsExpectedFailure(dialog);
    await expect(dialog).toHaveAccessibleName('Statut');
    await expect(dialog.getByRole('heading', { name: 'Statut' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Retour' })).toBeVisible();
    await expect(dialog.getByRole('radio')).toHaveCount(3);
    await expect(dialog.getByRole('radio', { name: 'Tous' })).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(1);

    await dialog.getByRole('button', { name: 'Retour' }).click();
    await expect(dialog).toHaveAccessibleName('Filtres');
    await expect(
        dialog.getByRole('button', { name: /^Statut\b/ })
    ).toBeFocused();
    await dialog.getByRole('button', { name: /^Statut\b/ }).click();

    for (const action of ['Réinitialiser', 'Appliquer']) {
        const button = dialog.getByRole('button', { name: action });
        await expect(button).toBeVisible();
        const box = requireBox(await button.boundingBox(), action);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.y + box.height).toBeLessThanOrEqual(COMPACT.height);
    }
});

test('compact : isole draft/applied et ne produit qu’un GET lors de Appliquer', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    let dialog = await openTemporaryFilters(page);
    const requestsAfterOpen = requests.length;
    await dialog.getByRole('button', { name: /^Statut\b/ }).click();
    await dialog.getByRole('radio', { name: 'Inactif' }).check();
    expect(requests).toHaveLength(requestsAfterOpen);

    await dialog.getByRole('button', { name: 'Réinitialiser' }).click();
    await expect(dialog.getByRole('radio', { name: 'Tous' })).toBeChecked();
    expect(requests).toHaveLength(requestsAfterOpen);

    await dialog.getByRole('radio', { name: 'Inactif' }).check();
    await dialog.getByRole('button', { name: 'Fermer les filtres' }).click();
    expect(requests).toHaveLength(requestsAfterOpen);

    dialog = await openTemporaryFilters(page);
    await dialog.getByRole('button', { name: /^Statut\b/ }).click();
    await expect(dialog.getByRole('radio', { name: 'Tous' })).toBeChecked();
    await dialog.getByRole('radio', { name: 'Inactif' }).check();

    const countBeforeApply = requests.length;
    await dialog.getByRole('button', { name: 'Appliquer' }).click();
    await expectOnlyOneUsersGet(requests, countBeforeApply);
    expect(requests.at(-1)).toContain('is_active=false');
    await expect(dialog).toHaveCount(0);
    await expect(filterTrigger(page)).toHaveAccessibleName('Filtres (1)');
});

test('résume seulement les filtres appliqués, limite les chips medium et retire avec un seul GET', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const dialog = await openDesktopFilters(page);
    for (const label of ['Profil', 'Rôle', 'Statut'] as const) {
        await addDesktopFilterIfNeeded(dialog, label);
    }
    await dialog
        .getByRole('combobox', { name: 'Profil', exact: true })
        .selectOption('profile-a');
    await dialog
        .getByRole('combobox', { name: 'Rôle', exact: true })
        .selectOption('agent');
    await dialog.getByRole('radio', { name: 'Inactif' }).check();
    await expect(
        page.getByRole('region', { name: 'Filtres appliqués' })
    ).toHaveCount(0);

    const countBeforeApply = requests.length;
    await dialog.getByRole('button', { name: /^(Appliquer|Filtrer)$/ }).click();
    await expectOnlyOneUsersGet(requests, countBeforeApply);
    const applied = page.getByRole('region', { name: 'Filtres appliqués' });
    const removable = applied.getByRole('button', {
        name: /^Retirer le filtre /,
    });
    await expect(removable).toHaveCount(2);
    await expect(
        applied.getByRole('button', {
            name: 'Afficher 1 filtre supplémentaire',
        })
    ).toHaveText('+1');
    await expect(filterTrigger(page)).toHaveAccessibleName('Filtres (3)');

    const countBeforeRemove = requests.length;
    await removable.first().click();
    await expectOnlyOneUsersGet(requests, countBeforeRemove);
    await expect(filterTrigger(page)).toHaveAccessibleName('Filtres (2)');
});

test('resize compact → medium → expanded → compact : conserve le draft sans GET', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    let container = await openTemporaryFilters(page);
    await container.getByRole('button', { name: /^Statut\b/ }).click();
    await container.getByRole('radio', { name: 'Inactif' }).check();
    const requestsBeforeResize = [...requests];

    await page.setViewportSize(MEDIUM);
    await waitForResponsiveLayout(page);
    container = page.locator('#user-filter-panel');
    await expect(
        container.getByRole('radio', { name: 'Inactif' })
    ).toBeChecked();
    expect(requests).toEqual(requestsBeforeResize);

    await page.setViewportSize(EXPANDED);
    await waitForResponsiveLayout(page);
    container = page.locator('#user-filter-panel');
    await expect(
        container.getByRole('radio', { name: 'Inactif' })
    ).toBeChecked();
    expect(requests).toEqual(requestsBeforeResize);

    await page.setViewportSize(COMPACT);
    await waitForResponsiveLayout(page);
    container = page.locator('#user-filter-panel');
    await expect(container).toHaveAttribute('role', 'dialog');
    await markLegacyCompactFilterA11yAsExpectedFailure(container);
    await expect(container).toHaveAccessibleName('Statut');
    await expect(
        container.getByRole('radio', { name: 'Inactif' })
    ).toBeChecked();
    expect(requests).toEqual(requestsBeforeResize);
});

test('frontières : respecte largeur/hauteur, 320 CSS px et texte agrandi sans masquer les actions', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize({
        width: EXPANDED_MIN_WIDTH - 1,
        height: EXPANDED_MIN_HEIGHT,
    });
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    await openDesktopFilters(page);
    const requestsBeforeResize = [...requests];
    await page.setViewportSize({
        width: EXPANDED_MIN_WIDTH,
        height: EXPANDED_MIN_HEIGHT,
    });
    await waitForResponsiveLayout(page);
    let container = page.locator('#user-filter-panel');
    await expect(container).toBeVisible();
    expect(requests).toEqual(requestsBeforeResize);

    await page.setViewportSize({
        width: EXPANDED.width,
        height: EXPANDED_MIN_HEIGHT - 1,
    });
    await waitForResponsiveLayout(page);
    container = page.locator('#user-filter-panel');
    await expect(container).toBeVisible();
    expect(requests).toEqual(requestsBeforeResize);

    await page.setViewportSize({ width: 320, height: 640 });
    await page.addStyleTag({
        content: ':root { font-size: 200% !important; }',
    });
    await waitForResponsiveLayout(page);
    container = page.getByRole('dialog', { name: 'Filtres' });
    const box = requireBox(await container.boundingBox(), 'bottom sheet 320px');
    expect(box.height).toBeLessThanOrEqual(640 * 0.8 + 1);
    await expect(
        container.getByRole('button', { name: 'Réinitialiser' })
    ).toBeVisible();
    await expect(
        container.getByRole('button', { name: 'Appliquer' })
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1
        )
    ).toBe(true);
    expect(requests).toEqual(requestsBeforeResize);
});

test('ne rend jamais deux exemplaires interactifs du même filtre', async ({
    page,
}) => {
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    let container = await openTemporaryFilters(page);
    await expect(
        container.locator('input, select, [role="radio"]')
    ).toHaveCount(0);
    await container.getByRole('button', { name: /^Profil\b/ }).click();
    await expect(
        container.getByRole('combobox', { name: 'Profil', exact: true })
    ).toHaveCount(1);
    await expect(
        container.getByRole('button', { name: /^Rôle\b/ })
    ).toHaveCount(0);
    await expectUniqueIds(page);

    await page.setViewportSize(MEDIUM);
    await waitForResponsiveLayout(page);
    container = page.locator('#user-filter-panel');
    await expect(container.getByLabel('Profil', { exact: true })).toHaveCount(
        1
    );
    await expectUniqueIds(page);

    await page.setViewportSize(EXPANDED);
    await waitForResponsiveLayout(page);
    container = page.locator('#user-filter-panel');
    await expect(container.getByLabel('Profil', { exact: true })).toHaveCount(
        1
    );
    await expectUniqueIds(page);
});

test('n’invente ni tri, ni option, ni paramètre réseau hors contrat', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const dialog = await openDesktopFilters(page);
    for (const label of ['Profil', 'Rôle', 'Statut'] as const) {
        await addDesktopFilterIfNeeded(dialog, label);
    }
    await expect(dialog.getByText(/Trier|Sort by/i)).toHaveCount(0);
    expect(
        await dialog
            .getByRole('combobox', { name: 'Profil', exact: true })
            .locator('option')
            .evaluateAll((options) =>
                options.map((option) => (option as HTMLOptionElement).value)
            )
    ).toEqual(['', 'profile-a', 'profile-b', 'profile-c', 'profile-demo']);
    expect(
        await dialog
            .getByRole('combobox', { name: 'Rôle', exact: true })
            .locator('option')
            .evaluateAll((options) =>
                options.map((option) => (option as HTMLOptionElement).value)
            )
    ).toEqual(['', 'supervisor', 'team-leader', 'agent']);
    expect(
        await dialog
            .getByRole('radio')
            .evaluateAll((options) =>
                options.map((option) => (option as HTMLInputElement).value)
            )
    ).toEqual(['', 'active', 'inactive']);

    await dialog
        .getByRole('combobox', { name: 'Profil', exact: true })
        .selectOption('profile-a');
    await dialog
        .getByRole('combobox', { name: 'Rôle', exact: true })
        .selectOption('agent');
    await dialog.getByRole('radio', { name: 'Inactif' }).check();
    const countBeforeApply = requests.length;
    await dialog.getByRole('button', { name: /^(Appliquer|Filtrer)$/ }).click();
    await expectOnlyOneUsersGet(requests, countBeforeApply);

    const url = new URL(requests.at(-1) ?? '', 'https://example.invalid');
    expect([...url.searchParams.keys()].sort()).toEqual([
        'is_active',
        'page',
        'profile',
        'role',
    ]);
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('profile')).toBe('profile-a');
    expect(url.searchParams.get('role')).toBe('agent');
    expect(url.searchParams.get('is_active')).toBe('false');
});
