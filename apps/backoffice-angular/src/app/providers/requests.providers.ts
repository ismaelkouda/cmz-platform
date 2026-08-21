import { Provider } from '@angular/core';
import {
    AllRequestsRepository,
    QueuesRequestsRepository,
    RequestsDetailsRepository,
    TasksRequestsRepository,
} from '@cmz/requests-domain';
import {
    AllRequestsRepositoryImpl,
    QueuesRequestsRepositoryImpl,
    RequestsDetailsRepositoryImpl,
    TasksRequestsRepositoryImpl,
} from '@cmz/requests-data';
import {
    AllRequestsFacade,
    AllRequestsUseCase,
    QueuesRequestsFacade,
    QueuesRequestsUseCase,
    RequestsDetailsFacade,
    RequestsDetailsUseCase,
    TasksRequestsFacade,
    TasksRequestsUseCase,
} from '@cmz/requests-application';

/**
 * Composition root du module `requests` — bind ports domaine → impl data.
 *
 * OPS-25bis : chaque `XxxUseCase`/`XxxFacade` du module est
 * `@Service({ autoProvided: false })` (injecte directement ou
 * transitivement une `Repository` scopée ici) — fournis explicitement
 * ci-dessous pour résoudre dans le même injecteur que leurs `Repository`
 * (voir `provideAuthentication()` pour le pattern de référence).
 */
export function provideRequests(): Provider[] {
    return [
        {
            provide: QueuesRequestsRepository,
            useClass: QueuesRequestsRepositoryImpl,
        },
        {
            provide: TasksRequestsRepository,
            useClass: TasksRequestsRepositoryImpl,
        },
        {
            provide: AllRequestsRepository,
            useClass: AllRequestsRepositoryImpl,
        },
        {
            provide: RequestsDetailsRepository,
            useClass: RequestsDetailsRepositoryImpl,
        },
        AllRequestsUseCase,
        QueuesRequestsUseCase,
        TasksRequestsUseCase,
        RequestsDetailsUseCase,
        AllRequestsFacade,
        QueuesRequestsFacade,
        TasksRequestsFacade,
        RequestsDetailsFacade,
    ];
}
