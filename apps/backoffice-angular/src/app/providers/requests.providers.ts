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

/** Composition root du module `requests` — bind ports domaine → impl data. */
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
    ];
}
