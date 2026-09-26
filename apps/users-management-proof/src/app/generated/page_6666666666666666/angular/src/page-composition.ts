import {
    InjectionToken,
    Service,
    computed,
    inject,
    type Signal,
} from '@angular/core';
import { defer, tap } from 'rxjs';
import { CreateUserFacade as CreateUserNodeFacade } from './nodes/create-user/create-user.facade';
import { ListUserProfilesFacade as ProfilesSelectNodeFacade } from './nodes/profiles-select/list-user-profiles.facade';
import { ListUsersFacade as UsersListNodeFacade } from './nodes/users-list/list-users.facade';

export interface PageActionPermissionPort {
    has(permission: string): Signal<boolean>;
}

export const PAGE_ACTION_PERMISSION_PORT =
    new InjectionToken<PageActionPermissionPort>('PAGE_ACTION_PERMISSION_PORT');

export class PageActionPermissionDeniedError extends Error {
    readonly code = 'permission_denied';
    readonly missingPermissions: readonly string[];

    constructor(missingPermissions: readonly string[]) {
        super(`Missing required permissions: ${missingPermissions.join(', ')}`);
        this.name = 'PageActionPermissionDeniedError';
        this.missingPermissions = Object.freeze([...missingPermissions]);
    }
}

@Service({ autoProvided: false })
export class PageComposition {
    private readonly permissionPort = inject(PAGE_ACTION_PERMISSION_PORT);

    readonly profilesSelect = inject(ProfilesSelectNodeFacade);
    readonly usersList = inject(UsersListNodeFacade);
    private readonly createUserFacade = inject(CreateUserNodeFacade);
    private readonly createUserPermissionSignals = ['users.create'].map(
        (permission) => this.permissionPort.has(permission)
    );
    private readonly createUserAuthorized = computed(() =>
        this.createUserPermissionSignals.every((permission) => permission())
    );
    readonly createUser = {
        state: this.createUserFacade.state,
        result: this.createUserFacade.result,
        error: this.createUserFacade.error,
        authorized: this.createUserAuthorized,
        deniedBehavior: 'disable',
        submit: (
            input: Parameters<CreateUserNodeFacade['submit']>[0]
        ): ReturnType<CreateUserNodeFacade['submit']> =>
            defer(() => {
                const permissions = ['users.create'];
                const missingPermissions = permissions.filter(
                    (_permission, index) =>
                        !this.createUserPermissionSignals[index]()
                );
                if (missingPermissions.length > 0) {
                    throw new PageActionPermissionDeniedError(
                        missingPermissions
                    );
                }
                return this.createUserFacade.submit(input);
            }).pipe(
                tap(() => {
                    this.usersList.reload();
                })
            ),
    };
}
