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
import {
    AccessLogsFacade,
    AccessLogsUseCase,
    ProfilesPermissionsFacade,
    ProfilesPermissionsFindOneFacade,
    ProfilesPermissionsFindOneUseCase,
    ProfilesPermissionsPermissionsFacade,
    ProfilesPermissionsPermissionsUseCase,
    ProfilesPermissionsSelectFacade,
    ProfilesPermissionsSelectUseCase,
    ProfilesPermissionsUseCase,
    UsersFacade,
    UsersFindOneFacade,
    UsersFindOneUseCase,
    UsersUseCase,
} from '@cmz/settings-security-application';

/**
 * Composition root du module `settings-security` : wire les ports domaine
 * (`users` + `profiles-permissions` + `access-logs`) à leurs
 * implémentations `data`. À fournir au niveau app, même précédent que
 * `provideContentManagement()`.
 *
 * OPS-25bis (2026-08-21) : `UsersSelectUseCase`/`UsersSelectFacade` restent
 * volontairement `@Service()` (root) et absents de ce tableau —
 * `UsersSelectRepository` n'a aucun provider nulle part dans le repo (ni
 * ici ni dans `app.config.ts`) et ces deux classes n'ont aucun consommateur
 * UI (audit du repo, 2026-08-21) : code mort pré-existant, hors périmètre
 * de ce correctif. Ne pas les scoper artificiellement sans fournir aussi
 * leur repository.
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
        UsersUseCase,
        UsersFindOneUseCase,
        ProfilesPermissionsUseCase,
        ProfilesPermissionsFindOneUseCase,
        ProfilesPermissionsSelectUseCase,
        ProfilesPermissionsPermissionsUseCase,
        AccessLogsUseCase,
        UsersFacade,
        UsersFindOneFacade,
        ProfilesPermissionsFacade,
        ProfilesPermissionsFindOneFacade,
        ProfilesPermissionsSelectFacade,
        ProfilesPermissionsPermissionsFacade,
        AccessLogsFacade,
    ];
}
