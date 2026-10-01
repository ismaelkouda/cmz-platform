import { expect, type Page } from '@playwright/test';

const USERS = [
    {
        id: 'user-1',
        first_name: 'Test',
        last_name: 'Alpha',
        email: 'alpha.user@example.invalid',
        phone: '+000 00 00 00 00',
        profile: 'Profil A',
        role: 'supervisor',
        status: 'active',
        created_at: '2026-09-26T08:00:00Z',
        updated_at: '2026-09-26T08:00:00Z',
    },
];

const PROFILES = [
    { uniq_id: 'profile-a', name: 'Profil A' },
    { uniq_id: 'profile-b', name: 'Profil B' },
    { uniq_id: 'profile-c', name: 'Profil C' },
    { uniq_id: 'profile-demo', name: 'Profil de démonstration' },
];

export const COMPACT = { width: 390, height: 844 } as const;
export const MEDIUM = { width: 1024, height: 768 } as const;
export const EXPANDED = { width: 1440, height: 1024 } as const;
export const EXPANDED_MIN_WIDTH = 1200;
export const EXPANDED_MIN_HEIGHT = 800;
export const RESPONSIVE_QUIET_WINDOW_MS = 250;

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function requireBox(box: Box | null, label: string): Box {
    if (!box) throw new Error(`Géométrie introuvable : ${label}`);
    return box;
}

export async function installFilterOracleBackend(page: Page): Promise<void> {
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
            const currentPage = Number(url.searchParams.get('page') ?? '1');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: false,
                    message: 'SUCCESS',
                    data: {
                        current_page: currentPage,
                        last_page: 1,
                        per_page: 1,
                        total: 1,
                        data: USERS,
                    },
                }),
            });
            return;
        }

        await route.abort('blockedbyclient');
    });
}

export async function openReadyPage(page: Page): Promise<void> {
    await page.goto('/settings-security/users');
    await page.addStyleTag({
        content:
            '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
}

export function observeUsersRequests(page: Page): string[] {
    const requests: string[] = [];
    page.on('request', (request) => {
        const url = new URL(request.url());
        if (
            request.method() === 'GET' &&
            url.pathname.endsWith('/settings-and-security/users')
        ) {
            requests.push(`${url.pathname}${url.search}`);
        }
    });
    return requests;
}

export async function waitForResponsiveLayout(page: Page): Promise<void> {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve())
                );
            })
    );
    await page.waitForTimeout(RESPONSIVE_QUIET_WINDOW_MS);
}

export async function expectOnlyOneUsersGet(
    requests: string[],
    countBefore: number
): Promise<void> {
    await expect.poll(() => requests.length).toBe(countBefore + 1);
    await new Promise((resolve) =>
        setTimeout(resolve, RESPONSIVE_QUIET_WINDOW_MS)
    );
    expect(requests).toHaveLength(countBefore + 1);
}
