import { useCallback, useEffect, useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateUserClient } from '../../.stack-test-runtime/reactjs/page-composition-users-v2/src/nodes/create-user/create-user.client';
import { ServerResponseError } from '../../.stack-test-runtime/reactjs/page-composition-users-v2/src/nodes/create-user/create-user.decoder';
import { ListUserProfilesClient } from '../../.stack-test-runtime/reactjs/page-composition-users-v2/src/nodes/profiles-select/list-user-profiles.client';
import { ListUsersClient } from '../../.stack-test-runtime/reactjs/page-composition-users-v2/src/nodes/users-list/list-users.client';
import {
    PageActionPermissionDeniedError,
    type PageCompositionBinding,
} from '../../.stack-test-runtime/reactjs/page-composition-users-v2/src/page-composition';
import { createPageCompositionHooks } from '../../.stack-test-runtime/reactjs/page-composition-users-v2/src/page-composition.runtime';

const reactHooks = { useCallback, useEffect, useRef, useState };
const settingsBaseUrl = 'https://settings.example.test/';

function response(payload: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
    };
}

function usersPayload() {
    return {
        error: false,
        message: 'SUCCESS',
        data: {
            current_page: 1,
            data: [
                {
                    id: 'user-1',
                    first_name: 'Awa',
                    last_name: 'Kouda',
                    email: 'awa.kouda@example.test',
                    phone: '+2250102030405',
                    profile: 'Administrateur',
                    role: null,
                    status: 'active',
                    created_at: '2026-09-01T08:00:00Z',
                    updated_at: '2026-09-24T18:00:00Z',
                },
            ],
            last_page: 2,
            per_page: 10,
            total: 11,
        },
    };
}

function profilesPayload() {
    return {
        error: false,
        message: 'SUCCESS',
        data: [{ uniq_id: 'profile-admin', name: 'Administrateur' }],
    };
}

function userInput(email = 'mariam.kone@example.test') {
    return {
        firstName: 'Mariam',
        lastName: 'Koné',
        email,
        phone: '+2250506070809',
        profileId: 'profile-admin',
    };
}

interface Runtime {
    readonly createRequests: unknown[];
    readonly profileRequests: unknown[];
    readonly render: (
        permissions?: ReadonlySet<string>
    ) => ReturnType<
        typeof renderHook<PageCompositionBinding, ReadonlySet<string>>
    >;
    readonly userRequests: Array<{
        readonly isRefresh: boolean;
        readonly signal: AbortSignal;
        readonly policy: unknown;
        readonly url: string;
    }>;
}

function runtime({
    createResponse = async () => response({ error: false, message: 'SUCCESS' }),
    profilesResponse = async () => response(profilesPayload()),
    usersResponse = async () => response(usersPayload()),
}: {
    readonly createResponse?: () => Promise<ReturnType<typeof response>>;
    readonly profilesResponse?: () => Promise<ReturnType<typeof response>>;
    readonly usersResponse?: (
        call: number
    ) => Promise<ReturnType<typeof response>>;
} = {}): Runtime {
    const createRequests: unknown[] = [];
    const profileRequests: unknown[] = [];
    const userRequests: Runtime['userRequests'] = [];
    const createUserClient = new CreateUserClient(
        settingsBaseUrl,
        async (request) => {
            createRequests.push(request);
            return createResponse();
        }
    );
    const profilesSelectClient = new ListUserProfilesClient(
        settingsBaseUrl,
        async (request) => {
            profileRequests.push(request);
            return profilesResponse();
        }
    );
    const usersListClient = new ListUsersClient(
        settingsBaseUrl,
        async (request) => {
            userRequests.push(request);
            return usersResponse(userRequests.length);
        }
    );
    const hooks = createPageCompositionHooks(reactHooks, {
        createUserClient,
        profilesSelectClient,
        usersListClient,
    });
    return {
        createRequests,
        profileRequests,
        userRequests,
        render: (
            permissions: ReadonlySet<string> = new Set(['users.create'])
        ) =>
            renderHook(
                (currentPermissions: ReadonlySet<string>) =>
                    hooks.usePageComposition(currentPermissions),
                { initialProps: permissions }
            ),
    };
}

async function loadPage(binding: PageCompositionBinding): Promise<void> {
    await Promise.all([
        binding.usersList.load({ page: 1 }),
        binding.profilesSelect.load(),
    ]);
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('page composition C5 React — oracle externe hermétique', () => {
    it('charge les deux queries indépendantes avec leurs politiques host', async () => {
        const host = runtime();
        const rendered = host.render();

        await act(async () => loadPage(rendered.result.current));

        expect(rendered.result.current.usersList.items).toEqual([
            {
                uniqId: 'user-1',
                firstName: 'Awa',
                lastName: 'Kouda',
                email: 'awa.kouda@example.test',
                phone: '+2250102030405',
                profile: 'Administrateur',
                role: null,
                status: 'active',
                updatedAt: '2026-09-24T18:00:00Z',
            },
        ]);
        expect(rendered.result.current.usersList.page).toMatchObject({
            currentPage: 1,
            lastPage: 2,
            pageSize: 10,
            totalItems: 11,
        });
        expect(rendered.result.current.profilesSelect.items).toEqual([
            { value: 'profile-admin', label: 'Administrateur' },
        ]);
        expect(host.userRequests[0]).toMatchObject({
            isRefresh: false,
            policy: {
                authentication: { mode: 'host' },
                cache: { mode: 'host', scope: 'principal' },
            },
        });
        expect(host.profileRequests[0]).toMatchObject({
            isRefresh: false,
            policy: {
                authentication: { mode: 'host' },
                cache: { mode: 'host', scope: 'principal' },
            },
        });
    });

    it('refuse une création non autorisée avant le transport', async () => {
        const host = runtime();
        const rendered = host.render(new Set());

        expect(rendered.result.current.createUser.authorized).toBe(false);
        expect(rendered.result.current.createUser.deniedBehavior).toBe(
            'disable'
        );
        await act(async () => {
            await expect(
                rendered.result.current.createUser.submit(userInput())
            ).rejects.toBeInstanceOf(PageActionPermissionDeniedError);
        });

        expect(host.createRequests).toHaveLength(0);
        expect(rendered.result.current.createUser.state).toBe('idle');
    });

    it('revérifie les permissions à chaque rendu avant la mutation', async () => {
        const host = runtime();
        const rendered = host.render();
        expect(rendered.result.current.createUser.authorized).toBe(true);

        rendered.rerender(new Set());

        expect(rendered.result.current.createUser.authorized).toBe(false);
        await act(async () => {
            await expect(
                rendered.result.current.createUser.submit(userInput())
            ).rejects.toMatchObject({
                code: 'permission_denied',
                missingPermissions: ['users.create'],
            });
        });
        expect(host.createRequests).toHaveLength(0);
    });

    it('crée puis recharge uniquement users-list après le succès distant', async () => {
        const host = runtime();
        const rendered = host.render();
        await act(async () => loadPage(rendered.result.current));

        let result: unknown;
        await act(async () => {
            result =
                await rendered.result.current.createUser.submit(userInput());
            await Promise.resolve();
        });

        expect(result).toEqual({ message: 'SUCCESS' });
        expect(host.createRequests).toHaveLength(1);
        expect(host.createRequests[0]).toMatchObject({
            serviceId: 'settings-api',
            method: 'POST',
            policy: { authentication: { mode: 'host' } },
            body: {
                first_name: 'Mariam',
                last_name: 'Koné',
                email: 'mariam.kone@example.test',
                phone: '+2250506070809',
                profile_id: 'profile-admin',
            },
        });
        expect(host.userRequests).toHaveLength(2);
        expect(host.userRequests[1]?.isRefresh).toBe(true);
        expect(host.profileRequests).toHaveLength(1);
        expect(rendered.result.current.createUser.state).toBe('success');
    });

    it('ne recharge rien après une erreur métier de création', async () => {
        const host = runtime({
            createResponse: async () =>
                response({
                    error: true,
                    message: 'EMAIL_ALREADY_EXISTS',
                }),
        });
        const rendered = host.render();
        await act(async () => loadPage(rendered.result.current));

        await act(async () => {
            await expect(
                rendered.result.current.createUser.submit(
                    userInput('duplicate@example.test')
                )
            ).rejects.toBeInstanceOf(ServerResponseError);
        });

        expect(host.userRequests).toHaveLength(1);
        expect(host.profileRequests).toHaveLength(1);
        expect(rendered.result.current.usersList.items).toHaveLength(1);
        expect(rendered.result.current.createUser.state).toBe('error');
    });

    it('préserve le succès distant quand le rafraîchissement local échoue', async () => {
        const host = runtime({
            usersResponse: async (call) => {
                if (call === 1) return response(usersPayload());
                throw new Error('refresh unavailable');
            },
        });
        const rendered = host.render();
        await act(async () => loadPage(rendered.result.current));

        await act(async () => {
            await expect(
                rendered.result.current.createUser.submit(userInput())
            ).resolves.toEqual({ message: 'SUCCESS' });
            await Promise.resolve();
        });

        expect(rendered.result.current.createUser.state).toBe('success');
        expect(rendered.result.current.usersList.state).toBe('error');
        expect(rendered.result.current.usersList.items).toHaveLength(1);
    });

    it('annule les deux lectures quand le scope React est démonté', async () => {
        let resolveUsers!: (value: ReturnType<typeof response>) => void;
        let resolveProfiles!: (value: ReturnType<typeof response>) => void;
        const usersPending = new Promise<ReturnType<typeof response>>(
            (resolve) => {
                resolveUsers = resolve;
            }
        );
        const profilesPending = new Promise<ReturnType<typeof response>>(
            (resolve) => {
                resolveProfiles = resolve;
            }
        );
        const host = runtime({
            usersResponse: async () => usersPending,
            profilesResponse: async () => profilesPending,
        });
        const rendered = host.render();
        let loading!: Promise<void>;

        await act(async () => {
            loading = loadPage(rendered.result.current);
            await Promise.resolve();
        });
        rendered.unmount();

        expect(host.userRequests[0]?.signal.aborted).toBe(true);
        expect(
            (host.profileRequests[0] as { signal: AbortSignal }).signal.aborted
        ).toBe(true);
        resolveUsers(response(usersPayload()));
        resolveProfiles(response(profilesPayload()));
        await act(async () => loading);
    });
});
