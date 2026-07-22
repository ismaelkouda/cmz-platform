import { inject, Injectable } from '@angular/core';
import { resourcesQueryMapper } from '@pages/seos-reference/application/queries-mappers/resources/resources.mapper';
import { ResourcesQuery } from '@pages/seos-reference/application/queries/resources/resources.query';
import { ResourcesUseCase } from '@pages/seos-reference/application/use-cases/resources/resources.use-case';
import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import { Paginate } from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesHandler {
    private readonly useCase = inject(ResourcesUseCase);

    execute(
        query: ResourcesQuery,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<ResourcesEntity>> {
        return this.useCase.execute(resourcesQueryMapper(query), page, options);
    }
}
