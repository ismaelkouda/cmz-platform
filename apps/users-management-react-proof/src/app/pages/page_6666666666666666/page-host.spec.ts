import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
    createUsersManagementPageRuntime,
    PageHostConfigurationError,
    type UsersManagementPageHostRequest,
} from './page-host';

function response(payload: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
    };
}

afterEach(cleanup);

describe('users management React page host', () => {
    it('binds the generated queries to the declared service without changing host policies', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        const runtime = createUsersManagementPageRuntime({
            serviceBaseUrls: {
                'settings-api': 'https://settings.example.test/backoffice',
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
            'https://settings.example.test/backoffice/settings-and-security/user-profiles/select-field',
            'https://settings.example.test/backoffice/settings-and-security/users?page=1',
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
                'settings-api': 'https://settings.example.test/backoffice/',
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
            url: 'https://settings.example.test/backoffice/settings-and-security/users/store',
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
                'settings-api': 'https://settings.example.test/backoffice/',
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
        'http://settings.example.test/backoffice',
        'https://user:secret@settings.example.test/backoffice',
        'https://settings.example.test/backoffice?tenant=hidden',
        'https://settings.example.test/backoffice#hidden',
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
                    'settings-api': 'https://settings.example.test/backoffice/',
                    'undeclared-api': 'https://other.example.test/',
                },
                request: async () => response({}),
            } as unknown as Parameters<
                typeof createUsersManagementPageRuntime
            >[0])
        ).toThrow(PageHostConfigurationError);
    });
});
