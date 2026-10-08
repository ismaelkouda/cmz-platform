import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
    createBrowserUsersManagementPageRuntime,
    createUsersManagementPageRuntime,
    PageHostConfigurationError,
    type UsersManagementPageHostRequest,
} from './page-host';

const HTTPS_SETTINGS_ORIGIN = ['https:', '', 'settings.example.test'].join('/');
const HTTP_SETTINGS_ORIGIN = ['http:', '', 'settings.example.test'].join('/');
const CREDENTIAL_SETTINGS_ORIGIN = [
    'https:',
    '',
    'user:secret@settings.example.test',
].join('/');
const OTHER_ORIGIN = ['https:', '', 'other.example.test'].join('/');
const SETTINGS_BASE_URL = `${HTTPS_SETTINGS_ORIGIN}/backoffice/`;
const SETTINGS_BASE_URL_WITHOUT_TRAILING_SLASH = `${HTTPS_SETTINGS_ORIGIN}/backoffice`;
const USERS_RESOURCE = ['settings-and-security', 'users'].join('/');
const PROFILES_RESOURCE = [
    'settings-and-security',
    'user-profiles',
    'select-field',
].join('/');
const CREATE_USER_RESOURCE = [USERS_RESOURCE, 'store'].join('/');

function response(payload: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
    };
}

afterEach(() => {
    cleanup();
    delete window.__cmzUsersManagementPageHost;
});

describe('users management React page host', () => {
    it('binds the generated queries to the declared service without changing host policies', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        const runtime = createUsersManagementPageRuntime({
            serviceBaseUrls: {
                'settings-api': SETTINGS_BASE_URL_WITHOUT_TRAILING_SLASH,
            },
            request: async (request) => {
                requests.push(request);
                if (
                    request.method === 'GET' &&
                    request.url.includes('profiles')
                ) {
                    return response({
                        error: false,
                        message: 'SUCCESS',
                        data: [],
                    });
                }
                return response({
                    error: false,
                    message: 'SUCCESS',
                    data: {
                        current_page: 1,
                        data: [],
                        last_page: 1,
                        per_page: 10,
                        total: 0,
                    },
                });
            },
        });
        const rendered = renderHook(() =>
            runtime.usePageComposition(new Set(['users.create']))
        );

        await act(async () => {
            await Promise.all([
                rendered.result.current.usersList.load({ page: 1 }),
                rendered.result.current.profilesSelect.load(),
            ]);
        });

        expect(requests).toHaveLength(2);
        expect(requests.map(({ serviceId }) => serviceId)).toEqual([
            'settings-api',
            'settings-api',
        ]);
        expect(requests.map(({ url }) => url).sort()).toEqual([
            `${SETTINGS_BASE_URL}${PROFILES_RESOURCE}`,
            `${SETTINGS_BASE_URL}${USERS_RESOURCE}?page=1`,
        ]);
        expect(
            requests.every(
                ({ policy }) => policy.authentication.mode === 'host'
            )
        ).toBe(true);
    });

    it('passes an authorized command through the same bounded host port', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        const runtime = createUsersManagementPageRuntime({
            serviceBaseUrls: {
                'settings-api': SETTINGS_BASE_URL,
            },
            request: async (request) => {
                requests.push(request);
                return response({ error: false, message: 'SUCCESS' });
            },
        });
        const rendered = renderHook(() =>
            runtime.usePageComposition(new Set(['users.create']))
        );

        await act(async () => {
            await rendered.result.current.createUser.submit({
                firstName: 'Mariam',
                lastName: 'Koné',
                email: 'mariam.kone@example.test',
                phone: '+2250506070809',
                profileId: 'profile-admin',
            });
        });

        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
            serviceId: 'settings-api',
            method: 'POST',
            url: `${SETTINGS_BASE_URL}${CREATE_USER_RESOURCE}`,
            body: {
                first_name: 'Mariam',
                last_name: 'Koné',
                email: 'mariam.kone@example.test',
                phone: '+2250506070809',
                profile_id: 'profile-admin',
            },
        });
    });

    it('keeps denied commands in the composition and never reaches the host port', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        const runtime = createUsersManagementPageRuntime({
            serviceBaseUrls: {
                'settings-api': SETTINGS_BASE_URL,
            },
            request: async (request) => {
                requests.push(request);
                return response({ error: false, message: 'SUCCESS' });
            },
        });
        const rendered = renderHook(() =>
            runtime.usePageComposition(new Set())
        );

        await act(async () => {
            await expect(
                rendered.result.current.createUser.submit({
                    firstName: 'Mariam',
                    lastName: 'Koné',
                    email: 'mariam.kone@example.test',
                    phone: '+2250506070809',
                    profileId: 'profile-admin',
                })
            ).rejects.toMatchObject({
                code: 'permission_denied',
                missingPermissions: ['users.create'],
            });
        });

        expect(requests).toHaveLength(0);
    });

    it.each([
        'settings.example.test/backoffice',
        `${HTTP_SETTINGS_ORIGIN}/backoffice`,
        `${CREDENTIAL_SETTINGS_ORIGIN}/backoffice`,
        `${SETTINGS_BASE_URL_WITHOUT_TRAILING_SLASH}?tenant=hidden`,
        `${SETTINGS_BASE_URL_WITHOUT_TRAILING_SLASH}#hidden`,
    ])('fails closed on unsafe service configuration %s', (baseUrl) => {
        expect(() =>
            createUsersManagementPageRuntime({
                serviceBaseUrls: { 'settings-api': baseUrl },
                request: async () => response({}),
            })
        ).toThrow(PageHostConfigurationError);
    });

    it('fails closed when the host widens the declared service table', () => {
        expect(() =>
            createUsersManagementPageRuntime({
                serviceBaseUrls: {
                    'settings-api': SETTINGS_BASE_URL,
                    'undeclared-api': `${OTHER_ORIGIN}/`,
                },
                request: async () => response({}),
            } as unknown as Parameters<
                typeof createUsersManagementPageRuntime
            >[0])
        ).toThrow(PageHostConfigurationError);
    });

    it('creates the runtime from the single public browser host seam', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        window.__cmzUsersManagementPageHost = {
            serviceBaseUrls: {
                'settings-api': SETTINGS_BASE_URL,
            },
            request: async (request: UsersManagementPageHostRequest) => {
                requests.push(request);
                return response({
                    error: false,
                    message: 'SUCCESS',
                    data: {
                        current_page: 1,
                        data: [],
                        last_page: 1,
                        per_page: 10,
                        total: 0,
                    },
                });
            },
        };

        const runtime = createBrowserUsersManagementPageRuntime();
        const rendered = renderHook(() =>
            runtime.usePageComposition(new Set())
        );

        await act(async () => {
            await rendered.result.current.usersList.load({ page: 1 });
        });

        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
            method: 'GET',
            serviceId: 'settings-api',
            url: `${SETTINGS_BASE_URL}${USERS_RESOURCE}?page=1`,
        });
    });

    it.each([
        undefined,
        null,
        true,
        [],
        {},
        {
            serviceBaseUrls: {
                'settings-api': SETTINGS_BASE_URL,
            },
        },
        {
            request: async () => response({}),
            serviceBaseUrls: {
                'settings-api': SETTINGS_BASE_URL,
            },
            token: 'must-not-be-accepted',
        },
    ])('fails closed for an invalid browser host seam', (raw) => {
        expect(() => createBrowserUsersManagementPageRuntime(raw)).toThrow(
            PageHostConfigurationError
        );
    });
});
