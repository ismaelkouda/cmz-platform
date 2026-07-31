import { Provider } from '@angular/core';
import {
    AllProcessingRepository,
    ProcessingDetailsRepository,
    QueuesProcessingRepository,
    TasksActionsRepository,
    TasksActionsTypeRepository,
    TasksProcessingRepository,
} from '@cmz/processing-domain';
import {
    AllProcessingRepositoryImpl,
    ProcessingDetailsRepositoryImpl,
    QueuesProcessingRepositoryImpl,
    TasksActionsRepositoryImpl,
    TasksActionsTypeRepositoryImpl,
    TasksProcessingRepositoryImpl,
} from '@cmz/processing-data';

/**
 * Composition root du module `processing` : bind les ports domaine vers leurs
 * implémentations data (une par volet liste, nommage `{Volet}Processing*`).
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
            provide: TasksActionsRepository,
            useClass: TasksActionsRepositoryImpl,
        },
        {
            provide: TasksActionsTypeRepository,
            useClass: TasksActionsTypeRepositoryImpl,
        },
    ];
}
