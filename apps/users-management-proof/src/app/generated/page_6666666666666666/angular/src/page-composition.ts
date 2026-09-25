import { Service, inject } from '@angular/core';
import { tap } from 'rxjs';
import { CreateUserFacade as CreateUserNodeFacade } from './nodes/create-user/create-user.facade';
import { ListUserProfilesFacade as ProfilesSelectNodeFacade } from './nodes/profiles-select/list-user-profiles.facade';
import { ListUsersFacade as UsersListNodeFacade } from './nodes/users-list/list-users.facade';

@Service({ autoProvided: false })
export class PageComposition {
    readonly profilesSelect = inject(ProfilesSelectNodeFacade);
    readonly usersList = inject(UsersListNodeFacade);

    private readonly createUserFacade = inject(CreateUserNodeFacade);
    readonly createUser = {
        state: this.createUserFacade.state,
        result: this.createUserFacade.result,
        error: this.createUserFacade.error,
        submit: (
            input: Parameters<CreateUserNodeFacade['submit']>[0]
        ): ReturnType<CreateUserNodeFacade['submit']> =>
            this.createUserFacade.submit(input).pipe(
                tap(() => {
                    this.usersList.reload();
                })
            ),
    };
}
