import type { CreateUserClient as CreateUserNodeClient } from './nodes/create-user/create-user.client';
import {
    type CreateUserBinding as CreateUserNodeBinding,
    createCreateUserHooks as createCreateUserNodeHooks,
} from './nodes/create-user/use-create-user';
import type { ListUserProfilesClient as ProfilesSelectNodeClient } from './nodes/profiles-select/list-user-profiles.client';
import { createListUserProfilesHooks as createProfilesSelectNodeHooks } from './nodes/profiles-select/use-list-user-profiles';
import type { ListUsersClient as UsersListNodeClient } from './nodes/users-list/list-users.client';
import { createListUsersHooks as createUsersListNodeHooks } from './nodes/users-list/use-list-users';

import {
    PageActionPermissionDeniedError,
    type PageCompositionBinding,
} from './page-composition';

export type ReactHooksPort = Parameters<typeof createCreateUserNodeHooks>[0];

export interface PageCompositionDependencies {
    readonly createUserClient: CreateUserNodeClient;
    readonly profilesSelectClient: ProfilesSelectNodeClient;
    readonly usersListClient: UsersListNodeClient;
}

export function createPageCompositionHooks(
    hooks: ReactHooksPort,
    dependencies: PageCompositionDependencies
) {
    const createUserNodeHooks = createCreateUserNodeHooks(
        hooks,
        dependencies.createUserClient
    );
    const profilesSelectNodeHooks = createProfilesSelectNodeHooks(
        hooks,
        dependencies.profilesSelectClient
    );
    const usersListNodeHooks = createUsersListNodeHooks(
        hooks,
        dependencies.usersListClient
    );

    function usePageComposition(
        grantedPermissions: ReadonlySet<string>
    ): PageCompositionBinding {
        const createUserNode = createUserNodeHooks.useCreateUser();
        const profilesSelectNode =
            profilesSelectNodeHooks.useListUserProfiles();
        const usersListNode = usersListNodeHooks.useListUsers();
        const createUserAuthorized = ['users.create'].every((permission) =>
            grantedPermissions.has(permission)
        );
        const submitCreateUser = hooks.useCallback(
            (
                input: Parameters<CreateUserNodeBinding['submit']>[0]
            ): ReturnType<CreateUserNodeBinding['submit']> => {
                const missingPermissions: readonly string[] = [
                    'users.create',
                ].filter((permission) => !grantedPermissions.has(permission));
                if (missingPermissions.length > 0) {
                    return Promise.reject(
                        new PageActionPermissionDeniedError(missingPermissions)
                    );
                }
                return createUserNode.submit(input).then((result) => {
                    void usersListNode.reload().catch(() => undefined);
                    return result;
                });
            },
            [grantedPermissions, createUserNode.submit, usersListNode.reload]
        );

        return {
            createUser: {
                ...createUserNode,
                authorized: createUserAuthorized,
                deniedBehavior: 'disable',
                submit: submitCreateUser,
            },
            profilesSelect: profilesSelectNode,
            usersList: usersListNode,
        };
    }

    return { usePageComposition };
}
