import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
    expectCentered,
    expectInsideViewport,
    formColumnCount,
    observeApiRequests,
    requireBox,
    waitForResponsiveLayout,
} from './adaptive-layout.support';

const USERS = [
    [
        'user-1',
        'Test',
        'Alpha',
        'alpha.user@example.invalid',
        'Profil A',
        'supervisor',
        'active',
        '2026-09-26T08:00:00Z',
    ],
    [
        'user-2',
        'Test',
        'Bravo',
        'bravo.user@example.invalid',
        'Profil B',
        'team-leader',
        'active',
        '2026-09-25T08:00:00Z',
    ],
    [
        'user-3',
        'Test',
        'Charlie',
        'charlie.user@example.invalid',
        'Profil C',
        'agent',
        'active',
        '2026-09-24T08:00:00Z',
    ],
    [
        'user-4',
        'Test',
        'Delta',
        'delta.user@example.invalid',
        'Profil A',
        'agent',
        'inactive',
        '2026-09-20T08:00:00Z',
    ],
    [
        'user-5',
        'Test',
        'Echo',
        'echo.user@example.invalid',
        'Profil B',
        'agent',
        'active',
        '2026-09-18T08:00:00Z',
    ],
].map(
    ([
        id,
        first_name,
        last_name,
        email,
        profile,
        role,
        status,
        updated_at,
    ]) => ({
        id,
        first_name,
        last_name,
        email,
        phone: '+000 00 00 00 00',
        profile,
        role,
        status,
        created_at: updated_at,
        updated_at,
    })
);

const PROFILES = [
    { uniq_id: 'profile-a', name: 'Profil A' },
    { uniq_id: 'profile-b', name: 'Profil B' },
    { uniq_id: 'profile-c', name: 'Profil C' },
    { uniq_id: 'profile-demo', name: 'Profil de démonstration' },
];

const COMPACT_MAX_WIDTH = 800;
const EXPANDED_MIN_WIDTH = 1200;
const EXPANDED_MIN_HEIGHT = 800;
const MEDIUM_PROOF_VIEWPORT = { width: 1024, height: 768 } as const;

async function installHostAndBackend(page: Page): Promise<void> {
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
    });

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;
        let payload: unknown;

        if (
            request.method() === 'GET' &&
            path.endsWith('/settings-and-security/user-profiles/select-field')
        ) {
            payload = { error: false, message: 'SUCCESS', data: PROFILES };
        } else if (
            request.method() === 'GET' &&
            path.endsWith('/settings-and-security/users')
        ) {
            const currentPage = Number(url.searchParams.get('page') ?? '1');
            payload = {
                error: false,
                message: 'SUCCESS',
                data: {
                    current_page: currentPage,
                    last_page: 2,
                    per_page: 5,
                    total: 42,
                    data: USERS,
                },
            };
        } else if (
            request.method() === 'POST' &&
            path.endsWith('/settings-and-security/users/store')
        ) {
            payload = {
                error: true,
                message: 'Cette adresse email existe déjà.',
            };
        } else {
            await route.abort('blockedbyclient');
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(payload),
        });
    });
}

async function openReadyPage(
    page: Page,
    permissions: readonly string[] = ['users.create']
): Promise<void> {
    await page.addInitScript(
        (authorizedPermissions) => {
            window.__cmzAppAccessContext = {
                authenticated: true,
                permissions: authorizedPermissions,
            };
        },
        [...permissions]
    );
    await page.goto('/settings-security/users');
    await page.addStyleTag({
        content:
            '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
    if (await page.locator('[data-cmz-id="mobile-results"]').isVisible()) {
        await expect(
            page.locator('[data-cmz-id="mobile-load-sentinel"]')
        ).toHaveCount(0);
    }
}

async function expectAdaptiveFiltersOrFailOnExactLegacy(
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
        'ADAPT-6 : le scénario de présentation attend désormais Réinitialiser sans réseau puis Appliquer dans le panneau adaptatif.'
    );
    if (legacyInlineFilters) expect(legacyInlineFilters).toBe(false);
}

async function expectDynamicCompactFilterNameOrFailOnExactLegacy(
    panel: Locator,
    expectedName: string
): Promise<void> {
    const legacyConstantName = await panel.evaluate(
        (element) =>
            element.getAttribute('aria-label') === 'Filtres' &&
            !element.hasAttribute('aria-labelledby')
    );

    test.fail(
        legacyConstantName,
        'ADAPT-7 : le scénario de présentation attend le nom accessible du critère compact et non le nom constant « Filtres ».'
    );
    await expect(panel).toHaveAccessibleName(expectedName);
}

async function captureCandidate(
    page: Page,
    testInfo: TestInfo,
    name: string
): Promise<void> {
    const path = testInfo.outputPath(name);
    await page.screenshot({
        path,
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
    });
    await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function submitEmailConflict(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Créer un utilisateur' }).click();
    const dialog = page.getByRole('dialog', { name: 'Créer un utilisateur' });
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-cmz-id="first-name"]').fill('Utilisateur');
    await dialog.locator('[data-cmz-id="last-name"]').fill('Exemple');
    await dialog
        .locator('[data-cmz-id="email"]')
        .fill('test.user@example.invalid');
    await dialog.locator('[data-cmz-id="phone"]').fill('+000 00 00 00 00');
    await expect(
        dialog.locator('[data-cmz-id="profile-id"] option')
    ).toHaveCount(PROFILES.length + 1);
    await dialog
        .locator('[data-cmz-id="profile-id"]')
        .selectOption('profile-demo');
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();

    await expect(page.locator('[data-cmz-id="create-failed"]')).toBeVisible();
    await expect(dialog.locator('[data-cmz-id="email"]')).toHaveValue(
        'test.user@example.invalid'
    );
    await expect(dialog.locator('#email-error')).toHaveText(
        'Cette adresse email existe déjà.'
    );
}

test.beforeEach(async ({ page }) => {
    await installHostAndBackend(page);
});

test('produit le candidat desktop ready depuis le vrai rendu Angular', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openReadyPage(page);

    await expect(page.locator('.desktop-table')).toBeVisible();
    await expect(page.locator('.mobile-results')).toBeHidden();
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await expect(
        page.getByRole('button', { name: 'Créer un utilisateur' })
    ).toBeEnabled();
    await expect(page.getByRole('cell', { name: 'Superviseur' })).toBeVisible();
    await expect(
        page.getByRole('cell', { name: 'Chef d’équipe' })
    ).toBeVisible();
    const pageOne = page.getByRole('button', { name: 'Page 1' });
    const pageTwo = page.getByRole('button', { name: 'Page 2' });
    await expect(pageOne).toHaveAttribute('aria-current', 'page');
    await expect(pageOne).toHaveCSS('width', '40px');
    await expect(pageTwo).toHaveCSS('width', '40px');
    await pageTwo.click();
    await expect(pageTwo).toHaveAttribute('aria-current', 'page');
    await captureCandidate(page, testInfo, 'desktop-ready.actual.png');
});

test('produit le candidat mobile ready avec la projection en cartes', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);

    await expect(page.locator('.desktop-table')).toBeHidden();
    await expect(page.locator('.mobile-results')).toBeVisible();
    await expect(page.locator('.user-card')).toHaveCount(5);
    await expect(page.locator('.filters input').first()).toHaveCSS(
        'height',
        '44px'
    );
    const firstCard = requireBox(
        await page.locator('.user-card').first().boundingBox(),
        'première carte mobile'
    );
    expect(firstCard.height).toBeLessThan(100);
    await captureCandidate(page, testInfo, 'mobile-ready.actual.png');
});

test('garde Appliquer et Réinitialiser accessibles sans effet réseau implicite', async ({
    page,
}) => {
    const apiRequests = observeApiRequests(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);
    await expectAdaptiveFiltersOrFailOnExactLegacy(page);

    const toggle = page.getByRole('button', {
        name: /^Filtres(?:\s|$)/,
    });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const requestsBeforeOpen = [...apiRequests];
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(apiRequests).toEqual(requestsBeforeOpen);

    let dialog = page.locator('#user-filter-panel');
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAccessibleName('Filtres');
    const apply = dialog.getByRole('button', {
        name: 'Appliquer',
        exact: true,
    });
    const reset = dialog.getByRole('button', {
        name: 'Réinitialiser',
        exact: true,
    });
    await expect(apply).toBeVisible();
    await expect(reset).toBeVisible();
    await expect(apply).toHaveCSS('min-height', '44px');
    await expect(reset).toHaveCSS('min-height', '44px');

    await dialog.getByRole('button', { name: /^Profil\b/ }).click();
    await expectDynamicCompactFilterNameOrFailOnExactLegacy(dialog, 'Profil');
    await dialog.getByLabel('Profil').selectOption('profile-a');
    expect(apiRequests).toEqual(requestsBeforeOpen);
    const requestsBeforeApply = apiRequests.length;
    await apply.click();
    await expect.poll(() => apiRequests.length).toBe(requestsBeforeApply + 2);
    expect(apiRequests.at(-1)).toContain('profile=profile-a');
    await expect(toggle).toHaveAccessibleName('Filtres (1)');

    await toggle.click();
    dialog = page.locator('#user-filter-panel');
    await expect(dialog).toHaveAccessibleName('Filtres');
    await dialog.getByRole('button', { name: /^Profil\b/ }).click();
    await expect(dialog).toHaveAccessibleName('Profil');
    const requestsBeforeReset = apiRequests.length;
    await dialog.getByRole('button', { name: 'Réinitialiser' }).click();
    await expect(dialog.getByLabel('Profil')).toHaveValue('');
    expect(apiRequests).toHaveLength(requestsBeforeReset);

    await dialog.getByRole('button', { name: 'Appliquer' }).click();
    await expect.poll(() => apiRequests.length).toBe(requestsBeforeReset + 2);
    await expect(toggle).toHaveAccessibleName('Filtres');
    expect(apiRequests.at(-1)).not.toContain('profile=');
});

test('prouve le conflit étroit dans un dialogue plein écran', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);
    await submitEmailConflict(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCSS('width', '390px');
    const dialogBox = requireBox(
        await dialog.boundingBox(),
        'task sheet compacte'
    );
    const titleBox = requireBox(
        await dialog.getByRole('heading').boundingBox(),
        'titre du drawer mobile'
    );
    expect(titleBox.height).toBeLessThan(30);
    const create = dialog.getByRole('button', { name: 'Créer', exact: true });
    const cancel = dialog.getByRole('button', { name: 'Annuler' });
    const [rawCreateBox, rawCancelBox] = await Promise.all([
        create.boundingBox(),
        cancel.boundingBox(),
    ]);
    const createBox = requireBox(rawCreateBox, 'action Créer mobile');
    const cancelBox = requireBox(rawCancelBox, 'action Annuler mobile');
    await expect(create).toBeEnabled();
    expect(dialogBox.x).toBeCloseTo(0, 0);
    expect(dialogBox.y).toBeCloseTo(0, 0);
    expect(dialogBox.width).toBeCloseTo(390, 0);
    expect(dialogBox.height).toBeCloseTo(844, 0);
    expect(await formColumnCount(dialog)).toBe(1);
    expect(Math.abs(createBox.y - cancelBox.y)).toBeLessThan(2);
    expect(cancelBox.x).toBeLessThan(createBox.x);
    await captureCandidate(
        page,
        testInfo,
        'compact-create-conflict.actual.png'
    );

    await dialog
        .locator('[data-cmz-id="email"]')
        .fill('autre.user@example.invalid');
    await expect(create).toBeEnabled();
    await expect(page.locator('[data-cmz-id="create-failed"]')).toBeHidden();
    await expect(page.locator('.toast-error')).toBeHidden();
});

test('produit le candidat medium ready depuis le vrai rendu Angular', async ({
    page,
}, testInfo) => {
    await page.setViewportSize(MEDIUM_PROOF_VIEWPORT);
    await openReadyPage(page);

    await expect(page.locator('.desktop-table')).toBeVisible();
    await expect(page.locator('.mobile-results')).toBeHidden();
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 1024);
    await captureCandidate(page, testInfo, 'medium-ready.actual.png');
});

test('verrouille la frontière compact actuelle sans appel réseau de resize', async ({
    page,
}) => {
    const apiRequests = observeApiRequests(page);
    await page.setViewportSize({ width: COMPACT_MAX_WIDTH - 1, height: 900 });
    await openReadyPage(page);
    await expect(page.locator('.mobile-results')).toBeVisible();
    await expect(page.locator('.desktop-table')).toBeHidden();

    for (const width of [COMPACT_MAX_WIDTH, COMPACT_MAX_WIDTH + 1]) {
        const requestsBeforeResize = [...apiRequests];
        await page.setViewportSize({ width, height: 900 });
        await waitForResponsiveLayout(page);
        expect(apiRequests).toEqual(requestsBeforeResize);
        if (width === COMPACT_MAX_WIDTH) {
            await expect(page.locator('.mobile-results')).toBeVisible();
            await expect(page.locator('.desktop-table')).toBeHidden();
        }
    }

    await expect(page.locator('.desktop-table')).toBeVisible();
    await expect(page.locator('.mobile-results')).toBeHidden();
});

test('préserve liste, formulaire, erreur et focus sans réseau au resize compact vers medium', async ({
    page,
}, testInfo) => {
    const apiRequests = observeApiRequests(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);

    const search = page.locator('.filters input').first();
    await search.fill('Alpha');
    await expect
        .poll(
            () =>
                apiRequests.filter(
                    (request) =>
                        request.startsWith('GET ') && request.includes('page=2')
                ).length
        )
        .toBe(1);
    await submitEmailConflict(page);

    const email = page.locator('[data-cmz-id="email"]');
    await email.focus();
    await expect(email).toBeFocused();
    const requestsBeforeResize = [...apiRequests];

    await page.setViewportSize(MEDIUM_PROOF_VIEWPORT);
    await waitForResponsiveLayout(page);

    expect(apiRequests).toEqual(requestsBeforeResize);
    await expect(page.locator('.desktop-table')).toBeVisible();
    await expect(page.locator('.mobile-results')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
        'aria-current',
        'page'
    );
    await expect(search).toHaveValue('Alpha');
    await expect(email).toHaveValue('test.user@example.invalid');
    await expect(email).toBeFocused();
    await expect(page.locator('[data-cmz-id="create-failed"]')).toBeVisible();
    await captureCandidate(
        page,
        testInfo,
        'medium-create-error-after-resize.actual.png'
    );
});

test('active un FAB compact unique sans pagination et conserve updated_at', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);

    const create = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await expect(create).toHaveCount(1);
    const position = await create.evaluate(
        (element) => getComputedStyle(element).position
    );
    test.fail(
        position === 'static',
        'ADAPT-5 : le bouton compact historique doit céder la place au FAB approuvé.'
    );

    expect(position).toBe('fixed');
    await expect(create).toBeEnabled();
    await expect(page.locator('.user-card').first()).toContainText(
        '26/09/2026'
    );

    await expect(
        page.getByRole('navigation', { name: 'Pagination des utilisateurs' })
    ).toHaveCount(0);
    const rawFabBox = await create.boundingBox();
    const fabBox = requireBox(rawFabBox, 'FAB compact');
    expect(fabBox.height).toBeGreaterThanOrEqual(48);
    expect(fabBox.width).toBe(56);
    expect(fabBox.x + fabBox.width).toBeLessThanOrEqual(390 - 16);
});

test('rend le dialogue régulier centré, modal, à une colonne et restitue le focus', async ({
    page,
}) => {
    await page.setViewportSize(MEDIUM_PROOF_VIEWPORT);
    await openReadyPage(page);

    const create = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await create.click();
    const dialog = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    const box = requireBox(await dialog.boundingBox(), 'dialogue Medium');
    expectInsideViewport(box, MEDIUM_PROOF_VIEWPORT);
    expectCentered(box, MEDIUM_PROOF_VIEWPORT);
    expect(await formColumnCount(dialog)).toBe(1);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('.backdrop')).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('inert', '');
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
    await expect(create).toBeFocused();
});

test('rend le dialogue large centré, modal, à deux colonnes et superposé à la liste', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openReadyPage(page);

    const create = page.getByRole('button', {
        name: 'Créer un utilisateur',
    });
    await create.click();
    const pane = page.getByRole('dialog', {
        name: 'Créer un utilisateur',
    });
    const paneBox = requireBox(await pane.boundingBox(), 'dialogue expanded');
    expectInsideViewport(paneBox, { width: 1440, height: 1024 });
    expectCentered(paneBox, { width: 1440, height: 1024 });
    expect(await formColumnCount(pane)).toBe(2);
    await expect(pane).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('.backdrop')).toHaveCount(1);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(create).toBeDisabled();
    await pane.getByRole('button', { name: 'Annuler' }).click();
    await expect(pane).toHaveCount(0);
    await expect(create).toBeFocused();
});

test('conserve permission, état, focus et silence réseau sur les trois classes', async ({
    page,
}) => {
    const apiRequests = observeApiRequests(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);

    const search = page.getByLabel('Rechercher un utilisateur');
    await search.fill('Alpha');
    await expect
        .poll(
            () =>
                apiRequests.filter(
                    (request) =>
                        request.startsWith('GET ') && request.includes('page=2')
                ).length
        )
        .toBe(1);
    await submitEmailConflict(page);
    const email = page.locator('[data-cmz-id="email"]');
    await email.focus();
    const requestsBeforeResize = [...apiRequests];

    await page.setViewportSize(MEDIUM_PROOF_VIEWPORT);
    await waitForResponsiveLayout(page);
    const mediumPane = page.getByRole('dialog');
    const mediumBox = requireBox(
        await mediumPane.boundingBox(),
        'dialogue Medium après resize'
    );

    expect(apiRequests).toEqual(requestsBeforeResize);
    expectInsideViewport(mediumBox, MEDIUM_PROOF_VIEWPORT);
    expectCentered(mediumBox, MEDIUM_PROOF_VIEWPORT);
    expect(await formColumnCount(mediumPane)).toBe(1);
    await expect(mediumPane).toHaveAttribute('aria-modal', 'true');
    await expect(email).toBeFocused();

    await page.setViewportSize({ width: 1440, height: 1024 });
    await waitForResponsiveLayout(page);
    const expandedPane = page.getByRole('dialog');
    expect(apiRequests).toEqual(requestsBeforeResize);
    const expandedBox = requireBox(
        await expandedPane.boundingBox(),
        'dialogue large après resize'
    );
    expectInsideViewport(expandedBox, { width: 1440, height: 1024 });
    expectCentered(expandedBox, { width: 1440, height: 1024 });
    expect(await formColumnCount(expandedPane)).toBe(2);
    await expect(expandedPane).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('.backdrop')).toHaveCount(1);
    await expect(search).toHaveValue('Alpha');
    await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
        'aria-current',
        'page'
    );
    await expect(email).toHaveValue('test.user@example.invalid');
    await expect(email).toBeFocused();
    await expect(page.locator('[data-cmz-id="create-failed"]')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await waitForResponsiveLayout(page);
    expect(apiRequests).toEqual(requestsBeforeResize);
    const narrowPane = page.getByRole('dialog');
    const narrowBox = requireBox(
        await narrowPane.boundingBox(),
        'dialogue étroit après resize'
    );
    expect(narrowBox.x).toBeCloseTo(0, 0);
    expect(narrowBox.y).toBeCloseTo(0, 0);
    expect(narrowBox.width).toBeCloseTo(390, 0);
    expect(narrowBox.height).toBeCloseTo(844, 0);
    expect(await formColumnCount(narrowPane)).toBe(1);
    await expect(narrowPane).toHaveAttribute('aria-modal', 'true');
    await expect(email).toBeFocused();
});

test('verrouille le reflow du formulaire aux frontières sans réseau', async ({
    page,
}) => {
    const apiRequests = observeApiRequests(page);
    await page.setViewportSize({
        width: EXPANDED_MIN_WIDTH - 1,
        height: EXPANDED_MIN_HEIGHT,
    });
    await openReadyPage(page);
    await page.getByRole('button', { name: 'Créer un utilisateur' }).click();
    const pane = page.getByRole('dialog');
    const mediumBox = requireBox(
        await pane.boundingBox(),
        'dialogue à la frontière Medium'
    );
    expectInsideViewport(mediumBox, {
        width: EXPANDED_MIN_WIDTH - 1,
        height: EXPANDED_MIN_HEIGHT,
    });
    expectCentered(mediumBox, {
        width: EXPANDED_MIN_WIDTH - 1,
        height: EXPANDED_MIN_HEIGHT,
    });
    expect(await formColumnCount(pane)).toBe(1);
    await expect(pane).toHaveAttribute('aria-modal', 'true');
    const requestsBeforeResize = [...apiRequests];

    await page.setViewportSize({
        width: EXPANDED_MIN_WIDTH,
        height: EXPANDED_MIN_HEIGHT,
    });
    await waitForResponsiveLayout(page);
    expect(apiRequests).toEqual(requestsBeforeResize);
    await expect(pane).toHaveAttribute('aria-modal', 'true');
    let box = requireBox(await pane.boundingBox(), 'dialogue Expanded');
    expectInsideViewport(box, {
        width: EXPANDED_MIN_WIDTH,
        height: EXPANDED_MIN_HEIGHT,
    });
    expectCentered(box, {
        width: EXPANDED_MIN_WIDTH,
        height: EXPANDED_MIN_HEIGHT,
    });
    expect(await formColumnCount(pane)).toBe(2);

    await page.setViewportSize({
        width: 1440,
        height: EXPANDED_MIN_HEIGHT - 1,
    });
    await waitForResponsiveLayout(page);
    expect(apiRequests).toEqual(requestsBeforeResize);
    await expect(pane).toHaveAttribute('aria-modal', 'true');
    box = requireBox(await pane.boundingBox(), 'dialogue Medium bas');
    expectInsideViewport(box, {
        width: 1440,
        height: EXPANDED_MIN_HEIGHT - 1,
    });
    expectCentered(box, {
        width: 1440,
        height: EXPANDED_MIN_HEIGHT - 1,
    });
    expect(await formColumnCount(pane)).toBe(1);

    await page.setViewportSize({
        width: 1440,
        height: EXPANDED_MIN_HEIGHT,
    });
    await waitForResponsiveLayout(page);
    expect(apiRequests).toEqual(requestsBeforeResize);
    await expect(pane).toHaveAttribute('aria-modal', 'true');
    box = requireBox(await pane.boundingBox(), 'dialogue Expanded rétabli');
    expectInsideViewport(box, {
        width: 1440,
        height: EXPANDED_MIN_HEIGHT,
    });
    expectCentered(box, {
        width: 1440,
        height: EXPANDED_MIN_HEIGHT,
    });
    expect(await formColumnCount(pane)).toBe(2);
});

test('refuse la création sans permission dans chaque classe', async ({
    page,
}) => {
    const apiRequests = observeApiRequests(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page, []);
    const requestsAfterLoad = [...apiRequests];
    for (const viewport of [
        { width: 390, height: 844 },
        MEDIUM_PROOF_VIEWPORT,
        { width: 1440, height: 1024 },
    ]) {
        await page.setViewportSize(viewport);
        await waitForResponsiveLayout(page);
        const create = page.getByRole('button', {
            name: 'Créer un utilisateur',
        });
        await expect(create).toBeDisabled();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(apiRequests).toEqual(requestsAfterLoad);
    }
});
