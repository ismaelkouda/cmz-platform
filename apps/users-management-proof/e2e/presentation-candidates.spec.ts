import { expect, test, type Page, type TestInfo } from '@playwright/test';

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
const MEDIUM_PROOF_VIEWPORT = { width: 1024, height: 768 } as const;
const RESPONSIVE_QUIET_WINDOW_MS = 250;

function requireBox(
    box: { x: number; y: number; width: number; height: number } | null,
    label: string
): { x: number; y: number; width: number; height: number } {
    if (!box) throw new Error(`Géométrie introuvable : ${label}`);
    return box;
}

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
        window.__cmzAppAccessContext = {
            authenticated: true,
            permissions: ['users.create'],
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
                    last_page: 9,
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

async function openReadyPage(page: Page): Promise<void> {
    await page.goto('/settings-security/users');
    await page.addStyleTag({
        content:
            '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
    await expect(page.locator('[data-cmz-id="profiles"] option')).toHaveCount(
        PROFILES.length + 1
    );
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

async function waitForResponsiveLayout(page: Page): Promise<void> {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve())
                );
            })
    );
    // A negative network assertion needs a bounded quiet window after layout.
    // This also catches a delayed resize handler instead of checking too early.
    await page.waitForTimeout(RESPONSIVE_QUIET_WINDOW_MS);
}

function observeApiRequests(page: Page): string[] {
    const requests: string[] = [];
    page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/')) {
            requests.push(`${request.method()} ${url.pathname}${url.search}`);
        }
    });
    return requests;
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

test('produit le candidat desktop create-failed sans perdre la liste', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openReadyPage(page);
    await submitEmailConflict(page);

    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCSS('width', '520px');
    const toast = page.locator('.toast-error');
    const errorTitle = page.locator('[data-cmz-id="create-failed"] strong');
    const errorDetail = page.locator('[data-cmz-id="create-failed"] span');
    const [rawDialogBox, rawToastBox, rawTitleBox, rawDetailBox] =
        await Promise.all([
            dialog.boundingBox(),
            toast.boundingBox(),
            errorTitle.boundingBox(),
            errorDetail.boundingBox(),
        ]);
    const dialogBox = requireBox(rawDialogBox, 'drawer desktop');
    const toastBox = requireBox(rawToastBox, 'toast desktop');
    const titleBox = requireBox(rawTitleBox, "titre d'erreur desktop");
    const detailBox = requireBox(rawDetailBox, "détail d'erreur desktop");
    expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(dialogBox.x);
    expect(detailBox.y).toBeGreaterThan(titleBox.y);
    await captureCandidate(page, testInfo, 'desktop-create-error.actual.png');
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

test('produit le candidat mobile create-failed en plein écran', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);
    await submitEmailConflict(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCSS('width', '390px');
    const titleBox = requireBox(
        await dialog.getByRole('heading').boundingBox(),
        'titre du drawer mobile'
    );
    expect(titleBox.height).toBeLessThan(30);
    const create = dialog.getByRole('button', { name: 'Créer', exact: true });
    const cancel = dialog.getByRole('button', { name: 'Annuler' });
    await expect(create).toBeDisabled();
    const [rawCreateBox, rawCancelBox] = await Promise.all([
        create.boundingBox(),
        cancel.boundingBox(),
    ]);
    const createBox = requireBox(rawCreateBox, 'action Créer mobile');
    const cancelBox = requireBox(rawCancelBox, 'action Annuler mobile');
    expect(createBox.y).toBeLessThan(cancelBox.y);
    await captureCandidate(page, testInfo, 'mobile-create-error.actual.png');

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
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.locator('.mobile-summary')).toContainText('Page 2 / 9');
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
    await expect(page.getByRole('dialog')).toHaveCSS('width', '520px');
    await captureCandidate(
        page,
        testInfo,
        'medium-create-error-after-resize.actual.png'
    );
});
