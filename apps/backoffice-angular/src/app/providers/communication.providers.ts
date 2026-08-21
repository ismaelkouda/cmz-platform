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
import {
    MessagingFacade,
    MessagingFindOneFacade,
    MessagingFindOneUseCase,
    MessagingUseCase,
    NotificationsFacade,
    NotificationsUseCase,
} from '@cmz/communication-application';

/**
 * Composition root du module `communication` : wire les ports domaine
 * (`messaging` + `notifications`) à leurs implémentations `data`. Même
 * précédent que `provideSettingsSecurity()`.
 *
 * OPS-25bis (2026-08-21) : `MessagingSelectUseCase`/`MessagingSelectFacade`
 * restent volontairement `@Service()` (root) et absents de ce tableau —
 * `MessagingSelectRepository` n'a aucun provider nulle part dans le repo
 * (ni ici ni dans `app.config.ts`) et ces deux classes n'ont aucun
 * consommateur UI (audit du repo, 2026-08-21) : code mort pré-existant,
 * hors périmètre de ce correctif. Ne pas les scoper artificiellement sans
 * fournir aussi leur repository.
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
        MessagingUseCase,
        MessagingFindOneUseCase,
        NotificationsUseCase,
        MessagingFacade,
        MessagingFindOneFacade,
        NotificationsFacade,
    ];
}
