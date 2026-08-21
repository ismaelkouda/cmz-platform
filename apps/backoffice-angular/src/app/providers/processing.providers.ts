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
import {
    AllProcessingFacade,
    AllProcessingUseCase,
    ProcessingDetailsFacade,
    ProcessingDetailsUseCase,
    QueuesProcessingFacade,
    QueuesProcessingUseCase,
    TasksActionsProcessingFacade,
    TasksActionsProcessingUseCase,
    TasksActionsTypeProcessingFacade,
    TasksActionsTypeProcessingUseCase,
    TasksProcessingFacade,
    TasksProcessingUseCase,
} from '@cmz/processing-application';

/**
 * Composition root du module `processing` : bind les ports domaine vers leurs
 * implémentations data (une par volet liste + details + tasks/actions, nommage `{Volet}Processing*` / `TasksActionsProcessing*`).
 *
 * OPS-25bis (2026-08-21) : les 6 UseCase et 6 Facade de ce module sont
 * passés à `@Service({ autoProvided: false })` (voir leurs docstrings
 * respectifs, et celui de `LoginUseCase`/`LoginFacade` dans
 * `authentication`) car ils injectent — directement ou transitivement
 * (`ProcessingDetailsFacade` injecte `QueuesProcessingFacade`,
 * `TasksProcessingFacade` et `AllProcessingFacade`) — un Repository de ce
 * module, fourni uniquement dans cet injecteur de route. Fournis
 * explicitement ci-dessous pour que toute la chaîne
 * Facade → UseCase → Repository résolve dans le même injecteur enfant.
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
        QueuesProcessingUseCase,
        TasksProcessingUseCase,
        AllProcessingUseCase,
        ProcessingDetailsUseCase,
        TasksActionsProcessingUseCase,
        TasksActionsTypeProcessingUseCase,
        QueuesProcessingFacade,
        TasksProcessingFacade,
        AllProcessingFacade,
        ProcessingDetailsFacade,
        TasksActionsProcessingFacade,
        TasksActionsTypeProcessingFacade,
    ];
}
