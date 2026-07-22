import { Injectable, inject } from '@angular/core';
import { ResourcesCreateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.validate-contract';
import { ResourcesDeleteValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.validate-contract';
import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';
import { ResourcesUpdateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.validate-contract';
import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import { ResourcesRepository } from '@pages/seos-reference/domain/repositories/resources/resources.repository';
import { resourcesCreateMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources-create.mapper';
import { resourcesDeleteMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources-delete.mapper';
import { resourcesFilterMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources-filter.mapper';
import { resourcesUpdateMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources-update.mapper';
import { ResourcesMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources.mapper';
import { ResourcesApi } from '@pages/seos-reference/infrastructure/data/sources/resources/resources.api';
import {
    MessageResponseDto,
    Paginate,
} from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ResourcesRepositoryImpl implements ResourcesRepository {
    private readonly api = inject(ResourcesApi);
    private readonly mapper = inject(ResourcesMapper);

    execute(
        validContract: ResourcesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<ResourcesEntity>> {
        return this.api
            .readAll(resourcesFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: ResourcesCreateValidateContract
    ): Observable<MessageResponseDto> {
        return this.api.create(resourcesCreateMapper(validContract));
    }

    update(
        validContract: ResourcesUpdateValidateContract
    ): Observable<MessageResponseDto> {
        return this.api.update(resourcesUpdateMapper(validContract));
    }

    delete(
        validContract: ResourcesDeleteValidateContract
    ): Observable<MessageResponseDto> {
        return this.api.delete(resourcesDeleteMapper(validContract));
    }
}
