import {
    expect,
    test,
    type Locator,
    type Page,
    type Route,
} from '@playwright/test';
import {
    captureEvaluationCandidate,
    mediumCreateInvalidEvidence,
} from './visual-evaluation.support';
import {
    expectCentered,
    expectInsideViewport,
    formColumnCount,
    requireBox,
    waitForResponsiveLayout,
} from './adaptive-layout.support';

const COMPACT = { width: 390, height: 844 } as const;
const MEDIUM = { width: 1024, height: 768 } as const;
const EXPANDED = { width: 1440, height: 1024 } as const;
const QUIET_WINDOW_MS = 250;

const USERS = [
    {
        id: 'user-1',
        first_name: 'Test',
        last_name: 'Alpha',
        email: 'alpha.user@example.invalid',
        phone: '+000 00 00 00 00',
        profile: 'Profil A',
        role: 'agent',
        status: 'active',
        created_at: '2026-09-30T08:00:00Z',
        updated_at: '2026-09-30T08:00:00Z',
    },
];

const PROFILES = [{ uniq_id: 'profile-a', name: 'Profil A' }];

interface BackendHarness {
    createPosts: number;
    events: string[];
    usersGets: number;
}

interface BackendOptions {
    createResponder?: (route: Route, ordinal: number) => Promise<void>;
}

async function fulfillCreateSuccess(route: Route): Promise<void> {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            error: false,
            message: 'SUCCESS',
        }),
    });
}

async function installHostAndBackend(
    page: Page,
    options: BackendOptions = {}
): Promise<BackendHarness> {
    const harness: BackendHarness = {
        createPosts: 0,
        events: [],
        usersGets: 0,
    };

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

        if (
            request.method() === 'GET' &&
            path.endsWith('/settings-and-security/user-profiles/select-field')
        ) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: false,
                    message: 'SUCCESS',
                    data: PROFILES,
                }),
            });
            return;
        }

        if (
            request.method() === 'GET' &&
            path.endsWith('/settings-and-security/users')
        ) {
            harness.usersGets += 1;
            harness.events.push(`GET users ${url.search}`);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: false,
                    message: 'SUCCESS',
                    data: {
                        current_page: 1,
                        last_page: 1,
                        per_page: 1,
                        total: 1,
                        data: USERS,
                    },
                }),
            });
            return;
        }

        if (
            request.method() === 'POST' &&
            path.endsWith('/settings-and-security/users/store')
        ) {
            harness.createPosts += 1;
            harness.events.push('POST users/store');
            if (options.createResponder) {
                await options.createResponder(route, harness.createPosts);
            } else {
                await fulfillCreateSuccess(route);
            }
            return;
        }

        await route.abort('blockedbyclient');
    });

    return harness;
}

async function openReadyPage(page: Page): Promise<void> {
    await page.goto('/settings-security/users');
    await page.addStyleTag({
        content:
            '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
}

function createTrigger(page: Page): Locator {
    return page.getByRole('button', { name: 'Créer un utilisateur' });
}

function createDialog(page: Page): Locator {
    return page.getByRole('dialog', { name: 'Créer un utilisateur' });
}

async function openCreate(page: Page): Promise<Locator> {
    await createTrigger(page).click();
    const dialog = createDialog(page);
    await expect(dialog).toBeVisible();
    return dialog;
}

async function fillValidCreate(dialog: Locator): Promise<void> {
    await dialog.locator('[data-cmz-id="last-name"]').fill('Exemple');
    await dialog.locator('[data-cmz-id="first-name"]').fill('Ada');
    await dialog.locator('[data-cmz-id="email"]').fill('ada@example.invalid');
    await dialog.locator('[data-cmz-id="phone"]').fill('+000 00 00 00 00');
    await dialog
        .locator('[data-cmz-id="profile-id"]')
        .selectOption('profile-a');
}

test('étroit : rend un dialogue plein écran avec trois régions stables', async ({
    page,
}) => {
    await installHostAndBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    const dialog = await openCreate(page);

    const box = requireBox(await dialog.boundingBox(), 'surface compacte');
    expect(box.x).toBeCloseTo(0, 0);
    expect(box.y).toBeCloseTo(0, 0);
    expect(box.width).toBeCloseTo(COMPACT.width, 0);
    expect(box.height).toBeCloseTo(COMPACT.height, 0);
    expect(await formColumnCount(dialog)).toBe(1);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(dialog.locator('[data-cmz-id="create-header"]')).toBeVisible();
    await expect(dialog.locator('[data-cmz-id="create-body"]')).toBeVisible();
    await expect(
        dialog.locator('[data-cmz-id="create-actions"]')
    ).toBeVisible();
});

test('régulier : centre une surface modale à une colonne sans redimensionner la liste', async ({
    page,
}) => {
    await installHostAndBackend(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const mainBefore = requireBox(
        await page.locator('main').boundingBox(),
        'liste Medium avant ouverture'
    );
    const dialog = await openCreate(page);

    const [mainAfterRaw, dialogRaw] = await Promise.all([
        page.locator('main').boundingBox(),
        dialog.boundingBox(),
    ]);
    const mainAfter = requireBox(mainAfterRaw, 'liste Medium après ouverture');
    const box = requireBox(dialogRaw, 'dialogue Medium');
    expect(mainAfter).toEqual(mainBefore);
    expectInsideViewport(box, MEDIUM);
    expectCentered(box, MEDIUM);
    expect(await formColumnCount(dialog)).toBe(1);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
});

test('large : centre une surface modale à deux colonnes sans redimensionner la liste', async ({
    page,
}) => {
    await installHostAndBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    const mainBefore = requireBox(
        await page.locator('main').boundingBox(),
        'liste Expanded avant ouverture'
    );
    const dialog = await openCreate(page);

    const [mainAfterRaw, dialogRaw] = await Promise.all([
        page.locator('main').boundingBox(),
        dialog.boundingBox(),
    ]);
    const mainAfter = requireBox(
        mainAfterRaw,
        'liste Expanded après ouverture'
    );
    const box = requireBox(dialogRaw, 'dialogue Expanded');
    expect(mainAfter).toEqual(mainBefore);
    expectInsideViewport(box, EXPANDED);
    expectCentered(box, EXPANDED);
    expect(await formColumnCount(dialog)).toBe(2);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.locator('.backdrop')).toBeVisible();
});

test('conserve l’ordre Nom, Prénom, Email, Téléphone, Profil et focalise Nom', async ({
    page,
}) => {
    await installHostAndBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    const dialog = await openCreate(page);
    const fields = dialog.locator(
        '[data-cmz-id="last-name"], [data-cmz-id="first-name"], [data-cmz-id="email"], [data-cmz-id="phone"], [data-cmz-id="profile-id"]'
    );
    const ids = await fields.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-cmz-id'))
    );
    expect(ids).toEqual([
        'last-name',
        'first-name',
        'email',
        'phone',
        'profile-id',
    ]);
    await expect(dialog.locator('[data-cmz-id="last-name"]')).toBeFocused();
    const close = dialog.getByRole('button', { name: 'Fermer' });
    await expect(close).toBeVisible();
    expect((await close.textContent())?.trim()).toBe('×');
});

test('une soumission invalide ne POST pas, annonce les erreurs et focalise Nom', async ({
    page,
}, testInfo) => {
    const harness = await installHostAndBackend(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const mainBefore = requireBox(
        await page.locator('main').boundingBox(),
        'liste Medium avant erreur de création'
    );
    const dialog = await openCreate(page);
    const create = dialog.getByRole('button', { name: 'Créer', exact: true });
    await expect(create).toBeEnabled({ timeout: 2_000 });
    await create.click();
    expect(harness.createPosts).toBe(0);
    await expect(dialog.locator('[role="alert"]')).toContainText(
        /champs obligatoires/i
    );
    for (const id of [
        'last-name-error',
        'first-name-error',
        'email-error',
        'phone-error',
        'profile-error',
    ]) {
        await expect(dialog.locator(`#${id}`)).toBeVisible();
    }
    await expect(dialog.locator('[data-cmz-id="last-name"]')).toBeFocused();
    const errorSelector = [
        'last-name-error',
        'first-name-error',
        'email-error',
        'phone-error',
        'profile-error',
    ]
        .map((id) => `#${id}:visible`)
        .join(', ');
    const [
        dialogBoxRaw,
        mainAfterRaw,
        documentOverflows,
        dialogRole,
        accessibleName,
        ariaModal,
        backgroundInert,
        alertVisible,
        fieldErrorCount,
        focusedControl,
        alertText,
    ] = await Promise.all([
        dialog.boundingBox(),
        page.locator('main').boundingBox(),
        page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1
        ),
        dialog.getAttribute('role'),
        dialog.locator('#create-title').innerText(),
        dialog.getAttribute('aria-modal'),
        page.locator('main').getAttribute('inert'),
        dialog.locator('[role="alert"]').isVisible(),
        dialog.locator(errorSelector).count(),
        page.evaluate(() =>
            document.activeElement?.getAttribute('data-cmz-id')
        ),
        dialog.locator('[role="alert"]').innerText(),
    ]);
    const dialogBox = requireBox(dialogBoxRaw, 'dialogue Medium invalide');
    const mainAfter = requireBox(
        mainAfterRaw,
        'liste Medium après erreur de création'
    );
    expect(mainAfter).toEqual(mainBefore);
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(MEDIUM.width + 1);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(
        MEDIUM.height + 1
    );
    expect(documentOverflows).toBe(false);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('main')).toHaveAttribute('inert', '');

    await captureEvaluationCandidate(
        page,
        testInfo,
        'medium-create-invalid.actual.png',
        'medium-create-invalid.evidence.json',
        mediumCreateInvalidEvidence(MEDIUM, {
            dialogRole,
            accessibleName,
            ariaModal,
            backgroundInert: backgroundInert !== null,
            createPosts: harness.createPosts,
            alertVisible,
            fieldErrorCount,
            focusedControl: focusedControl ?? null,
            backgroundLayoutStable:
                JSON.stringify(mainAfter) === JSON.stringify(mainBefore),
            dialogWidth: dialogBox.width,
            dialogHeight: dialogBox.height,
            leftInsideViewport: dialogBox.x >= 0,
            topInsideViewport: dialogBox.y >= 0,
            rightInsideViewport:
                dialogBox.x + dialogBox.width <= MEDIUM.width + 1,
            bottomInsideViewport:
                dialogBox.y + dialogBox.height <= MEDIUM.height + 1,
            documentOverflows,
            alertText,
        })
    );
});

test('un brouillon modifié demande confirmation pour Échap puis restitue le focus', async ({
    page,
}) => {
    await installHostAndBackend(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const trigger = createTrigger(page);
    const dialog = await openCreate(page);
    const lastName = dialog.locator('[data-cmz-id="last-name"]');
    await lastName.fill('Brouillon');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const confirmation = page.getByRole('dialog', {
        name: /abandonner la création/i,
    });
    await expect(dialog).toBeVisible({ timeout: 2_000 });
    await expect(confirmation).toBeVisible({ timeout: 2_000 });
    await confirmation
        .getByRole('button', { name: /continuer|poursuivre/i })
        .click();
    await expect(confirmation).toHaveCount(0);
    await expect(lastName).toHaveValue('Brouillon');
    expect(
        await dialog.evaluate((element) =>
            element.contains(document.activeElement)
        )
    ).toBe(true);

    await page.keyboard.press('Escape');
    await page
        .getByRole('dialog', { name: /abandonner la création/i })
        .getByRole('button', { name: /abandonner/i })
        .click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('un conflit email conserve le brouillon, annonce l’erreur et focalise Email', async ({
    page,
}) => {
    const harness = await installHostAndBackend(page, {
        createResponder: async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: true,
                    message: 'Cette adresse email existe déjà.',
                }),
            });
        },
    });
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    const dialog = await openCreate(page);
    await fillValidCreate(dialog);
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(page.locator('[data-cmz-id="create-failed"]')).toBeVisible();

    const email = dialog.locator('[data-cmz-id="email"]');
    expect(harness.createPosts).toBe(1);
    await expect(email).toBeFocused({ timeout: 2_000 });
    await expect(dialog.locator('#email-error')).toContainText(/existe déjà/i);
    await expect(dialog.locator('[role="alert"]')).toContainText(
        /email|e-mail/i
    );
    await expect(dialog.locator('[data-cmz-id="last-name"]')).toHaveValue(
        'Exemple'
    );
    await expect(dialog.locator('[data-cmz-id="first-name"]')).toHaveValue(
        'Ada'
    );
    await expect(dialog.locator('[data-cmz-id="phone"]')).toHaveValue(
        '+000 00 00 00 00'
    );
    await expect(dialog.locator('[data-cmz-id="profile-id"]')).toHaveValue(
        'profile-a'
    );
});

test('borne la soumission à un POST et conserve les valeurs pendant le mono-vol', async ({
    page,
}) => {
    let releaseCreate!: () => void;
    const createGate = new Promise<void>((resolve) => {
        releaseCreate = resolve;
    });
    const harness = await installHostAndBackend(page, {
        createResponder: async (route) => {
            await createGate;
            await fulfillCreateSuccess(route);
        },
    });
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    const dialog = await openCreate(page);
    await fillValidCreate(dialog);
    const create = dialog.getByRole('button', { name: 'Créer', exact: true });
    await create.click();
    await expect.poll(() => harness.createPosts).toBe(1);
    const submitting = dialog.getByRole('button', { name: 'Création…' });
    await expect(submitting).toBeDisabled();
    await submitting.evaluate((button: HTMLButtonElement) => button.click());
    await page.waitForTimeout(QUIET_WINDOW_MS);
    expect(harness.createPosts).toBe(1);
    await expect(dialog.locator('[data-cmz-id="last-name"]')).toHaveValue(
        'Exemple'
    );
    await expect(dialog.locator('[data-cmz-id="email"]')).toHaveValue(
        'ada@example.invalid'
    );
    releaseCreate();
    await expect(dialog).toHaveCount(0);
});

test('un succès ferme, rafraîchit une fois, notifie et restitue le focus', async ({
    page,
}) => {
    const harness = await installHostAndBackend(page);
    await page.setViewportSize(MEDIUM);
    await openReadyPage(page);
    const trigger = createTrigger(page);
    const usersGetsBeforeSubmit = harness.usersGets;
    const dialog = await openCreate(page);
    await fillValidCreate(dialog);
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click();

    await expect(dialog).toHaveCount(0);
    expect(harness.createPosts).toBe(1);
    expect(harness.usersGets).toBe(usersGetsBeforeSubmit + 1);
    await expect(page.locator('[data-cmz-id="created"]')).toHaveRole('status');
    await expect(page.locator('[data-cmz-id="created"]')).toContainText(
        /créé/i
    );
    await expect(trigger).toBeFocused();
});

test('un resize conserve instance, valeurs, focus, liste et silence réseau', async ({
    page,
}) => {
    const harness = await installHostAndBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    const mainBefore = requireBox(
        await page.locator('main').boundingBox(),
        'liste avant resize'
    );
    const dialog = await openCreate(page);
    await fillValidCreate(dialog);
    const email = dialog.locator('[data-cmz-id="email"]');
    await email.focus();
    const emailHandle = await email.elementHandle();
    const eventsBeforeResize = [...harness.events];

    await page.setViewportSize(MEDIUM);
    await waitForResponsiveLayout(page);
    await page.setViewportSize(EXPANDED);
    await waitForResponsiveLayout(page);

    expect(harness.events).toEqual(eventsBeforeResize);
    await expect(email).toHaveValue('ada@example.invalid');
    await expect(email).toBeFocused();
    expect(
        await emailHandle?.evaluate(
            (element) =>
                element === document.querySelector('[data-cmz-id="email"]')
        )
    ).toBe(true);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const mainAfter = requireBox(
        await page.locator('main').boundingBox(),
        'liste après resize'
    );
    expect(mainAfter.x).toBe(mainBefore.x);
    expect(mainAfter.width).toBe(EXPANDED.width);
});

test('320 CSS px et texte à 200 % gardent header, corps, footer et zéro scroll horizontal', async ({
    page,
}) => {
    await installHostAndBackend(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await openReadyPage(page);
    const dialog = await openCreate(page);
    await page.addStyleTag({
        content: ':root { font-size: 200% !important; }',
    });
    await waitForResponsiveLayout(page);
    const surfaceOverflowY = await dialog.evaluate(
        (element) => getComputedStyle(element).overflowY
    );
    expect(['auto', 'scroll']).not.toContain(surfaceOverflowY);

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1
        )
    ).toBe(true);
    const box = requireBox(await dialog.boundingBox(), 'dialogue reflow');
    expect(box.width).toBeLessThanOrEqual(320);
    expect(box.height).toBeLessThanOrEqual(640);
    await expect(dialog.locator('[data-cmz-id="create-header"]')).toBeVisible({
        timeout: 2_000,
    });
    await expect(dialog.locator('[data-cmz-id="create-actions"]')).toBeVisible({
        timeout: 2_000,
    });
    const bodyMetrics = await dialog
        .locator('[data-cmz-id="create-body"]')
        .evaluate((element) => ({
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
        }));
    expect(bodyMetrics.scrollHeight).toBeGreaterThan(bodyMetrics.clientHeight);
    expect(bodyMetrics.scrollWidth).toBeLessThanOrEqual(
        bodyMetrics.clientWidth + 1
    );
});
