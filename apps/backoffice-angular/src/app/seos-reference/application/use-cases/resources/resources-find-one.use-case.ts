import { Injectable, inject } from '@angular/core';
import { ResourcesFindOneFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.contract';
import { ResourcesFindOneEntity } from '@pages/seos-reference/domain/entities/resources/resources-find-one.entity';
import { ResourcesFindOneRepository } from '@pages/seos-reference/domain/repositories/resources/resources-find-one.repository';
import { resourcesFindOneFilterVo } from '@pages/seos-reference/domain/value-objects/resources/resources-find-one-filter.vo';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { defer, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesFindOneUseCase {
    private readonly repository = inject(ResourcesFindOneRepository);

    execute(
        contract: ResourcesFindOneFilterContract,
        options?: FetchOptions
    ): Observable<ResourcesFindOneEntity> {
        return defer(() =>
            this.repository.execute(resourcesFindOneFilterVo(contract), options)
        );
    }
}
