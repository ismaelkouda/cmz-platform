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

async function openPersistentFilters(page: Page): Promise<Locator> {
    const trigger = filterTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 2_000 });
    await trigger.click();
    const pane = page.getByRole('complementary', { name: 'Filtres' });
    await expect(pane).toBeVisible({ timeout: 2_000 });
    return pane;
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

test('medium : borne le side sheet modal, son focus et restitue le déclencheur', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const trigger = filterTrigger(page);
    const dialog = await openTemporaryFilters(page);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.locator('[data-cmz-id="filter-backdrop"]')).toBeVisible();

    const box = requireBox(await dialog.boundingBox(), 'side sheet medium');
    expect(box.width).toBeGreaterThanOrEqual(420);
    expect(box.width).toBeLessThanOrEqual(480);
    expect(box.x + box.width).toBeLessThanOrEqual(MEDIUM.width + 1);
    expect(
        await dialog.evaluate((element) =>
            element.contains(document.activeElement)
        )
    ).toBe(true);

    const enabledControls = dialog.locator(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])'
    );
    await enabledControls.last().focus();
    await page.keyboard.press('Tab');
    expect(
        await dialog.evaluate((element) =>
            element.contains(document.activeElement)
        )
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('expanded : rend un supporting pane repliable, non modal et laisse la liste opérable', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const pane = await openPersistentFilters(page);
    await expect(page.getByRole('dialog', { name: 'Filtres' })).toHaveCount(0);
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await expect(page.locator('[data-cmz-id="filter-backdrop"]')).toHaveCount(
        0
    );

    const [mainBox, paneBox] = await Promise.all([
        page.locator('main').boundingBox(),
        pane.boundingBox(),
    ]);
    const main = requireBox(mainBox, 'liste expanded');
    const filters = requireBox(paneBox, 'supporting pane expanded');
    expect(filters.width).toBeGreaterThanOrEqual(360);
    expect(filters.width).toBeLessThanOrEqual(440);
    expect(main.x + main.width).toBeLessThanOrEqual(filters.x + 1);

    const requestsBeforeListInteraction = requests.length;
    const search = page.getByLabel('Rechercher un utilisateur');
    await search.fill('Alpha');
    await search.press('Enter');
    await expectOnlyOneUsersGet(requests, requestsBeforeListInteraction);
    await expect(pane).toBeVisible();

    await pane.getByLabel('Statut').selectOption('inactive');
    await pane.getByRole('button', { name: 'Replier les filtres' }).click();
    await expect(pane).toHaveCount(0);
    const reopened = await openPersistentFilters(page);
    await expect(reopened.getByLabel('Statut')).toHaveValue('inactive');
});

test('stress 15 champs : groupe les critères et garde header, corps scrollable et footer visibles', async ({
    page,
}) => {
    await page.setViewportSize({ width: MEDIUM.width, height: 520 });
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const dialog = await openTemporaryFilters(page);
    await expect(
        dialog.getByRole('group', { name: 'Essentiels' })
    ).toBeVisible();
    const groups = dialog.locator('[data-cmz-id="filter-groups"]');
    const body = dialog.locator('[data-cmz-id="filter-body"]');
    const footer = dialog.locator('[data-cmz-id="filter-actions"]');
    await expect(groups).toHaveCount(1);
    await expect(body).toBeVisible();
    await expect(footer).toBeVisible();

    // Test-only geometry stress: clone the real fieldset as inert, hidden from
    // assistive technology, and never bind it to Angular or the network.
    await groups.evaluate((container) => {
        const source = container.querySelector('fieldset');
        if (!source) throw new Error('Groupe Essentiels introuvable.');
        for (let index = 1; index < 5; index += 1) {
            const clone = source.cloneNode(true) as HTMLFieldSetElement;
            clone.setAttribute('aria-hidden', 'true');
            clone.setAttribute('inert', '');
            clone.dataset.cmzStressGroup = String(index);
            for (const identified of clone.querySelectorAll('[id]')) {
                identified.removeAttribute('id');
            }
            for (const control of clone.querySelectorAll('input, select')) {
                control.removeAttribute('name');
            }
            container.append(clone);
        }
    });

    const metrics = await body.evaluate((element) => ({
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);

    const [dialogBox, footerBox] = await Promise.all([
        dialog.boundingBox(),
        footer.boundingBox(),
    ]);
    const outer = requireBox(dialogBox, 'side sheet stress');
    const actions = requireBox(footerBox, 'footer stress');
    expect(actions.y + actions.height).toBeLessThanOrEqual(
        outer.y + outer.height + 1
    );
    await expect(
        dialog.getByRole('heading', { name: 'Filtres' })
    ).toBeVisible();
    await expect(
        dialog.getByRole('button', { name: 'Appliquer' })
    ).toBeVisible();
});

test('résume seulement les filtres appliqués, limite les chips medium et retire avec un seul GET', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const dialog = await openTemporaryFilters(page);
    await dialog.getByLabel('Profil').selectOption('profile-a');
    await dialog.getByLabel('Rôle').selectOption('agent');
    await dialog.getByLabel('Statut').selectOption('inactive');
    await expect(
        page.getByRole('region', { name: 'Filtres appliqués' })
    ).toHaveCount(0);

    const countBeforeApply = requests.length;
    await dialog.getByRole('button', { name: 'Appliquer' }).click();
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
    container = page.getByRole('dialog', { name: 'Filtres' });
    await expect(container.getByLabel('Statut')).toHaveValue('inactive');
    expect(requests).toEqual(requestsBeforeResize);

    await page.setViewportSize(EXPANDED);
    await waitForResponsiveLayout(page);
    container = page.getByRole('complementary', { name: 'Filtres' });
    await expect(container.getByLabel('Statut')).toHaveValue('inactive');
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

    await openTemporaryFilters(page);
    const requestsBeforeResize = [...requests];
    await page.setViewportSize({
        width: EXPANDED_MIN_WIDTH,
        height: EXPANDED_MIN_HEIGHT,
    });
    await waitForResponsiveLayout(page);
    let container = page.getByRole('complementary', { name: 'Filtres' });
    await expect(container).toBeVisible();
    expect(requests).toEqual(requestsBeforeResize);

    await page.setViewportSize({
        width: EXPANDED.width,
        height: EXPANDED_MIN_HEIGHT - 1,
    });
    await waitForResponsiveLayout(page);
    container = page.getByRole('dialog', { name: 'Filtres' });
    await expect(container).toHaveAttribute('aria-modal', 'true');
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
    await expect(container.getByLabel('Profil')).toHaveCount(1);
    await expect(
        container.getByRole('button', { name: /^Rôle\b/ })
    ).toHaveCount(0);
    await expectUniqueIds(page);

    await page.setViewportSize(MEDIUM);
    await waitForResponsiveLayout(page);
    container = page.getByRole('dialog', { name: 'Filtres' });
    for (const label of ['Profil', 'Rôle', 'Statut']) {
        const control = container.getByLabel(label, { exact: true });
        await expect(control).toHaveCount(1);
        await expect(control).toBeVisible();
    }
    await expectUniqueIds(page);

    await page.setViewportSize(EXPANDED);
    await waitForResponsiveLayout(page);
    container = page.getByRole('complementary', { name: 'Filtres' });
    for (const label of ['Profil', 'Rôle', 'Statut']) {
        const control = container.getByLabel(label, { exact: true });
        await expect(control).toHaveCount(1);
        await expect(control).toBeVisible();
    }
    await expectUniqueIds(page);
});

test('n’invente ni tri, ni option, ni paramètre réseau hors contrat', async ({
    page,
}) => {
    const requests = observeUsersRequests(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    await markLegacyInlineFiltersAsExpectedFailure(page);

    const dialog = await openTemporaryFilters(page);
    await expect(dialog.getByText(/Trier|Sort by/i)).toHaveCount(0);
    expect(
        await dialog
            .getByLabel('Profil')
            .locator('option')
            .evaluateAll((options) =>
                options.map((option) => (option as HTMLOptionElement).value)
            )
    ).toEqual(['', 'profile-a', 'profile-b', 'profile-c', 'profile-demo']);
    expect(
        await dialog
            .getByLabel('Rôle')
            .locator('option')
            .evaluateAll((options) =>
                options.map((option) => (option as HTMLOptionElement).value)
            )
    ).toEqual(['', 'supervisor', 'team-leader', 'agent']);
    expect(
        await dialog
            .getByLabel('Statut')
            .locator('option')
            .evaluateAll((options) =>
                options.map((option) => (option as HTMLOptionElement).value)
            )
    ).toEqual(['', 'active', 'inactive']);

    await dialog.getByLabel('Profil').selectOption('profile-a');
    await dialog.getByLabel('Rôle').selectOption('agent');
    await dialog.getByLabel('Statut').selectOption('inactive');
    const countBeforeApply = requests.length;
    await dialog.getByRole('button', { name: 'Appliquer' }).click();
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
