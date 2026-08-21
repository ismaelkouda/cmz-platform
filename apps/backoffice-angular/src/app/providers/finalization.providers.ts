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
import {
    AllFinalizationFacade,
    AllFinalizationUseCase,
    FinalizationDetailsFacade,
    FinalizationDetailsUseCase,
    QueuesFinalizationFacade,
    QueuesFinalizationUseCase,
    TasksFinalizationFacade,
    TasksFinalizationUseCase,
} from '@cmz/finalization-application';

/**
 * Composition root du module `finalization`.
 *
 * OPS-25bis : chaque `XxxUseCase`/`XxxFacade` du module est
 * `@Service({ autoProvided: false })` (injecte directement ou
 * transitivement une `Repository` scopée ici) — fournis explicitement
 * ci-dessous pour résoudre dans le même injecteur que leurs `Repository`
 * (voir `provideAuthentication()` pour le pattern de référence).
 */
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
        AllFinalizationUseCase,
        QueuesFinalizationUseCase,
        TasksFinalizationUseCase,
        FinalizationDetailsUseCase,
        AllFinalizationFacade,
        QueuesFinalizationFacade,
        TasksFinalizationFacade,
        FinalizationDetailsFacade,
    ];
}
