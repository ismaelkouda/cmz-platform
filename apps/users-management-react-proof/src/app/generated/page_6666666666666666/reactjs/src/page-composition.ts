import type { CreateUserBinding as CreateUserNodeBinding } from './nodes/create-user/use-create-user';
import type { ListUserProfilesBinding as ProfilesSelectNodeBinding } from './nodes/profiles-select/use-list-user-profiles';
import type { ListUsersBinding as UsersListNodeBinding } from './nodes/users-list/use-list-users';

export interface PageCompositionBinding {
    readonly createUser: Omit<CreateUserNodeBinding, 'submit'> & {
        readonly authorized: boolean;
        readonly deniedBehavior: 'disable';
        readonly submit: CreateUserNodeBinding['submit'];
    };
    readonly profilesSelect: ProfilesSelectNodeBinding;
    readonly usersList: UsersListNodeBinding;
}

export class PageActionPermissionDeniedError extends Error {
    readonly code = 'permission_denied';
    readonly missingPermissions: readonly string[];

    constructor(missingPermissions: readonly string[]) {
        super(`Missing required permissions: ${missingPermissions.join(', ')}`);
        this.name = 'PageActionPermissionDeniedError';
        this.missingPermissions = Object.freeze([...missingPermissions]);
    }
}
