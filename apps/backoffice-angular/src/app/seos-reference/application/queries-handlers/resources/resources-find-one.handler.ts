import { inject, Injectable } from '@angular/core';
import { resourcesFindOneQueryMapper } from '@pages/seos-reference/application/queries-mappers/resources/resources-find-one.mapper';
import { ResourcesFindOneQuery } from '@pages/seos-reference/application/queries/resources/resources-find-one.query';
import { ResourcesFindOneUseCase } from '@pages/seos-reference/application/use-cases/resources/resources-find-one.use-case';
import { ResourcesFindOneEntity } from '@pages/seos-reference/domain/entities/resources/resources-find-one.entity';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesFindOneHandler {
    private readonly useCase = inject(ResourcesFindOneUseCase);

    execute(
        command: ResourcesFindOneQuery,
        options?: FetchOptions
    ): Observable<ResourcesFindOneEntity> {
        return this.useCase.execute(
            resourcesFindOneQueryMapper(command),
            options
        );
    }
}
