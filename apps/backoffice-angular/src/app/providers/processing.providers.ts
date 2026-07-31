import { Provider } from '@angular/core';
import {
    AllProcessingRepository,
    ProcessingDetailsRepository,
    QueuesProcessingRepository,
    TasksActionsProcessingRepository,
    TasksActionsTypeProcessingRepository,
    TasksProcessingRepository,
} from '@cmz/processing-domain';
import {
    AllProcessingRepositoryImpl,
    ProcessingDetailsRepositoryImpl,
    QueuesProcessingRepositoryImpl,
    TasksActionsProcessingRepositoryImpl,
    TasksActionsTypeProcessingRepositoryImpl,
    TasksProcessingRepositoryImpl,
} from '@cmz/processing-data';

/**
 * Composition root du module `processing` : bind les ports domaine vers leurs
 * implémentations data (une par volet liste + details + tasks/actions, nommage `{Volet}Processing*` / `TasksActionsProcessing*`).
 */
export function provideProcessing(): Provider[] {
    return [
        {
            provide: QueuesProcessingRepository,
            useClass: QueuesProcessingRepositoryImpl,
        },
        {
            provide: TasksProcessingRepository,
            useClass: TasksProcessingRepositoryImpl,
        },
        {
            provide: AllProcessingRepository,
            useClass: AllProcessingRepositoryImpl,
        },
        {
            provide: ProcessingDetailsRepository,
            useClass: ProcessingDetailsRepositoryImpl,
        },
        {
            provide: TasksActionsProcessingRepository,
            useClass: TasksActionsProcessingRepositoryImpl,
        },
        {
            provide: TasksActionsTypeProcessingRepository,
            useClass: TasksActionsTypeProcessingRepositoryImpl,
        },
    ];
}
