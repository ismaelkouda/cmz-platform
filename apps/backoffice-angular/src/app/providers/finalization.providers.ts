import { Provider } from '@angular/core';
import {
    AllFinalizationRepository,
    FinalizationDetailsRepository,
    QueuesFinalizationRepository,
    TasksFinalizationRepository,
} from '@cmz/finalization-domain';
import {
    AllFinalizationRepositoryImpl,
    FinalizationDetailsRepositoryImpl,
    QueuesFinalizationRepositoryImpl,
    TasksFinalizationRepositoryImpl,
} from '@cmz/finalization-data';

/** Composition root du module `finalization`. */
export function provideFinalization(): Provider[] {
    return [
        {
            provide: QueuesFinalizationRepository,
            useClass: QueuesFinalizationRepositoryImpl,
        },
        {
            provide: TasksFinalizationRepository,
            useClass: TasksFinalizationRepositoryImpl,
        },
        {
            provide: AllFinalizationRepository,
            useClass: AllFinalizationRepositoryImpl,
        },
        {
            provide: FinalizationDetailsRepository,
            useClass: FinalizationDetailsRepositoryImpl,
        },
    ];
}
