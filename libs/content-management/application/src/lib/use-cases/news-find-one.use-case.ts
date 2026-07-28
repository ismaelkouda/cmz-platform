import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    NewsFindOneEntity,
    NewsFindOneFilterContract,
    NewsFindOneRepository,
    newsFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class NewsFindOneUseCase {
    private readonly repository = inject(NewsFindOneRepository);

    execute(
        contract: NewsFindOneFilterContract,
        options?: FetchOptions
    ): Observable<NewsFindOneEntity> {
        return defer(() =>
            this.repository.execute(newsFindOneFilterVo(contract), options)
        );
    }
}
