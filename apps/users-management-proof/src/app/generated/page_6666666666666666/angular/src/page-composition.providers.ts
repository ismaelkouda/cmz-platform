import type { Provider } from '@angular/core';
import { CreateUserFacade as CreateUserNodeFacade } from './nodes/create-user/create-user.facade';
import { CreateUserSource as CreateUserNodeSource } from './nodes/create-user/create-user.source';
import { ListUserProfilesFacade as ProfilesSelectNodeFacade } from './nodes/profiles-select/list-user-profiles.facade';
import { ListUserProfilesSource as ProfilesSelectNodeSource } from './nodes/profiles-select/list-user-profiles.source';
import { ListUsersFacade as UsersListNodeFacade } from './nodes/users-list/list-users.facade';
import { ListUsersSource as UsersListNodeSource } from './nodes/users-list/list-users.source';

import { PageComposition } from './page-composition';

export const PAGE_COMPOSITION_PROVIDERS: readonly Provider[] = [
    CreateUserNodeSource,
    CreateUserNodeFacade,
    ProfilesSelectNodeSource,
    ProfilesSelectNodeFacade,
    UsersListNodeSource,
    UsersListNodeFacade,
    PageComposition,
];
