import { Provider } from '@angular/core';
import {
    AccessLogsRepository,
    ProfilesPermissionsFindOneRepository,
    ProfilesPermissionsPermissionsRepository,
    ProfilesPermissionsRepository,
    ProfilesPermissionsSelectRepository,
    UsersFindOneRepository,
    UsersRepository,
} from '@cmz/settings-security-domain';
import {
    AccessLogsRepositoryImpl,
    ProfilesPermissionsFindOneRepositoryImpl,
    ProfilesPermissionsPermissionsRepositoryImpl,
    ProfilesPermissionsRepositoryImpl,
    ProfilesPermissionsSelectRepositoryImpl,
    UsersFindOneRepositoryImpl,
    UsersRepositoryImpl,
} from '@cmz/settings-security-data';

/**
 * Composition root du module `settings-security` : wire les ports domaine
 * (`users` + `profiles-permissions` + `access-logs`) à leurs
 * implémentations `data`. À fournir au niveau app, même précédent que
 * `provideContentManagement()`.
 */
export function provideSettingsSecurity(): Provider[] {
    return [
        { provide: UsersRepository, useClass: UsersRepositoryImpl },
        {
            provide: UsersFindOneRepository,
            useClass: UsersFindOneRepositoryImpl,
        },
        {
            provide: ProfilesPermissionsRepository,
            useClass: ProfilesPermissionsRepositoryImpl,
        },
        {
            provide: ProfilesPermissionsFindOneRepository,
            useClass: ProfilesPermissionsFindOneRepositoryImpl,
        },
        {
            provide: ProfilesPermissionsSelectRepository,
            useClass: ProfilesPermissionsSelectRepositoryImpl,
        },
        {
            provide: ProfilesPermissionsPermissionsRepository,
            useClass: ProfilesPermissionsPermissionsRepositoryImpl,
        },
        { provide: AccessLogsRepository, useClass: AccessLogsRepositoryImpl },
    ];
}
