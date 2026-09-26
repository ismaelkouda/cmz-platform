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
            payload = {
                error: false,
                message: 'SUCCESS',
                data: {
                    current_page: 1,
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
    await captureCandidate(page, testInfo, 'desktop-ready.actual.png');
});

test('produit le candidat desktop create-failed sans perdre la liste', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openReadyPage(page);
    await submitEmailConflict(page);

    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCSS('width', '520px');
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
    await captureCandidate(page, testInfo, 'mobile-ready.actual.png');
});

test('produit le candidat mobile create-failed en plein écran', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyPage(page);
    await submitEmailConflict(page);

    await expect(page.getByRole('dialog')).toHaveCSS('width', '390px');
    await captureCandidate(page, testInfo, 'mobile-create-error.actual.png');
});
