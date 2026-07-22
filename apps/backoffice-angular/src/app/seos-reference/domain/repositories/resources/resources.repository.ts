import { Injectable } from '@angular/core';
import { ResourcesCreateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.validate-contract';
import { ResourcesDeleteValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.validate-contract';
import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';
import { ResourcesUpdateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.validate-contract';
import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import {
    MessageResponseDto,
    Paginate,
} from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export abstract class ResourcesRepository {
    abstract execute(
        validContract: ResourcesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<ResourcesEntity>>;
    abstract create(
        validContract: ResourcesCreateValidateContract
    ): Observable<MessageResponseDto>;
    abstract update(
        validContract: ResourcesUpdateValidateContract
    ): Observable<MessageResponseDto>;
    abstract delete(
        validContract: ResourcesDeleteValidateContract
    ): Observable<MessageResponseDto>;
}
