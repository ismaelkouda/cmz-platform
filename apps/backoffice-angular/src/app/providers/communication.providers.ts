import { Provider } from '@angular/core';
import {
    MessagingFindOneRepository,
    MessagingRepository,
    NotificationsRepository,
} from '@cmz/communication-domain';
import {
    MessagingFindOneRepositoryImpl,
    MessagingRepositoryImpl,
    NotificationsRepositoryImpl,
} from '@cmz/communication-data';

/**
 * Composition root du module `communication` : wire les ports domaine
 * (`messaging` + `notifications`) à leurs implémentations `data`. Même
 * précédent que `provideSettingsSecurity()`.
 */
export function provideCommunication(): Provider[] {
    return [
        { provide: MessagingRepository, useClass: MessagingRepositoryImpl },
        {
            provide: MessagingFindOneRepository,
            useClass: MessagingFindOneRepositoryImpl,
        },
        {
            provide: NotificationsRepository,
            useClass: NotificationsRepositoryImpl,
        },
    ];
}
