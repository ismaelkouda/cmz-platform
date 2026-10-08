import { expect, type Page, type Request, type Route } from '@playwright/test';

export const APP_ORIGIN =
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4302';
export const SETTINGS_BASE_URL = `${new URL(APP_ORIGIN).origin}/api/settings/`;
export const USERS_PATH = '/settings-and-security/users';
export const PROFILES_PATH =
    '/settings-and-security/user-profiles/select-field';
export const CREATE_PATH = '/settings-and-security/users/store';

const USERS = [
    ['Mariam', 'Koné', 'Administrateur', 'supervisor', 'active'],
    ['Awa', 'Diabaté', 'Opérateur', 'team-leader', 'active'],
    ['Fatou', 'Traoré', 'Opérateur', 'agent', 'inactive'],
    ['Yao', 'N’Guessan', 'Auditeur', 'agent', 'pending'],
    ['Aïcha', 'Touré', 'Opérateur', 'agent', 'active'],
    ['Koffi', 'Kouamé', 'Auditeur', null, 'blocked'],
] as const;

export interface ObservedApiRequest {
    readonly method: string;
    readonly pathname: string;
    readonly search: string;
    readonly body: unknown;
}

export interface DeterministicApi {
    readonly requests: ObservedApiRequest[];
    readonly userReads: () => number;
    readonly profileReads: () => number;
    readonly writes: () => number;
}

export interface UserFixture {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email?: string;
    readonly profile?: string;
    readonly role?: string | null;
    readonly status?: string;
}

export interface UsersRouteContext {
    readonly route: Route;
    readonly url: URL;
    readonly pageNumber: number;
    readonly attempt: number;
}

function userPayload(user: UserFixture, index: number) {
    return {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email:
            user.email ??
            `${user.firstName}.${user.lastName}`
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[’']/g, '')
                .toLowerCase()
                .concat('@example.test'),
        phone: `+22501020304${String(index).padStart(2, '0')}`,
        profile: user.profile ?? 'Opérateur',
        role: user.role ?? 'agent',
        status: user.status ?? 'active',
        created_at: '2026-09-01T08:00:00.000Z',
        updated_at: `2026-10-${String(index + 1).padStart(2, '0')}T10:30:00.000Z`,
    };
}

function usersPayload() {
    const users: readonly UserFixture[] = USERS.map(
        ([firstName, lastName, profile, role, status], index) => ({
            id: `user-${index + 1}`,
            firstName,
            lastName,
            profile,
            role,
            status,
        })
    );
    return {
        error: false,
        message: 'SUCCESS',
        data: {
            current_page: 1,
            last_page: 2,
            per_page: 10,
            total: 24,
            data: users.map(userPayload),
        },
    };
}

const PROFILES_PAYLOAD = {
    error: false,
    message: 'SUCCESS',
    data: [
        { uniq_id: 'profile-admin', name: 'Administrateur' },
        { uniq_id: 'profile-operator', name: 'Opérateur' },
        { uniq_id: 'profile-auditor', name: 'Auditeur' },
    ],
};

async function requestBody(request: Request): Promise<unknown> {
    if (request.method() !== 'POST') return null;
    try {
        return request.postDataJSON();
    } catch {
        return request.postData();
    }
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
    await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

export async function fulfillUsersPage(
    route: Route,
    options: {
        readonly users: readonly UserFixture[];
        readonly currentPage: number;
        readonly lastPage: number;
        readonly total?: number;
        readonly status?: number;
    }
): Promise<void> {
    await fulfillJson(
        route,
        {
            error: false,
            message: 'SUCCESS',
            data: {
                current_page: options.currentPage,
                last_page: options.lastPage,
                per_page: options.users.length,
                total: options.total ?? options.users.length,
                data: options.users.map(userPayload),
            },
        },
        options.status
    );
}

export async function installBrowserHost(
    page: Page,
    permissions: readonly string[] = ['users.create']
): Promise<void> {
    await page.addInitScript(
        ({ baseUrl, grantedPermissions }) => {
            const target = window as Window & {
                __cmzAppAccessContext?: unknown;
                __cmzUsersManagementPageHost?: unknown;
            };
            target.__cmzAppAccessContext = {
                authenticated: true,
                permissions: grantedPermissions,
            };
            target.__cmzUsersManagementPageHost = {
                serviceBaseUrls: { 'settings-api': baseUrl },
                request: (request: {
                    readonly url: string;
                    readonly method: 'GET' | 'POST';
                    readonly headers?: Readonly<Record<string, string>>;
                    readonly body?: unknown;
                    readonly signal?: AbortSignal;
                }) =>
                    fetch(request.url, {
                        method: request.method,
                        headers: request.headers,
                        body:
                            request.body === undefined
                                ? undefined
                                : JSON.stringify(request.body),
                        signal: request.signal,
                    }),
            };
        },
        { baseUrl: SETTINGS_BASE_URL, grantedPermissions: [...permissions] }
    );
}

export async function serveDeterministicApi(
    page: Page,
    options: {
        readonly createError?: string;
        readonly delayUsersMs?: number;
        readonly usersResponder?: (context: UsersRouteContext) => Promise<void>;
    } = {}
): Promise<DeterministicApi> {
    const requests: ObservedApiRequest[] = [];
    let userReads = 0;
    let profileReads = 0;
    let writes = 0;
    const attempts = new Map<number, number>();

    await page.route('**/api/settings/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        requests.push({
            method: request.method(),
            pathname: url.pathname,
            search: url.search,
            body: await requestBody(request),
        });

        if (request.method() === 'POST' && url.pathname.endsWith(CREATE_PATH)) {
            writes += 1;
            await fulfillJson(
                route,
                options.createError
                    ? { error: true, message: options.createError }
                    : { error: false, message: 'Utilisateur créé.' }
            );
            return;
        }
        if (url.pathname.endsWith(PROFILES_PATH)) {
            profileReads += 1;
            await fulfillJson(route, PROFILES_PAYLOAD);
            return;
        }
        if (url.pathname.endsWith(USERS_PATH)) {
            userReads += 1;
            const pageNumber = Number(url.searchParams.get('page') ?? '1');
            const attempt = (attempts.get(pageNumber) ?? 0) + 1;
            attempts.set(pageNumber, attempt);
            if (options.usersResponder) {
                await options.usersResponder({
                    route,
                    url,
                    pageNumber,
                    attempt,
                });
                return;
            }
            if (options.delayUsersMs) {
                await new Promise((resolve) =>
                    setTimeout(resolve, options.delayUsersMs)
                );
            }
            await fulfillJson(route, usersPayload());
            return;
        }
        await route.abort('blockedbyclient');
    });

    return {
        requests,
        userReads: () => userReads,
        profileReads: () => profileReads,
        writes: () => writes,
    };
}

export async function openReadyPage(page: Page): Promise<void> {
    await page.goto('/settings-security/users');
    await expect(page.locator('[data-cmz-user-id="user-1"]')).toBeVisible();
}
