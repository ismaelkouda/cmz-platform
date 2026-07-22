import { Injectable, inject } from '@angular/core';
import { ResourcesCreateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.contract';
import { ResourcesDeleteContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.contract';
import { ResourcesUpdateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.contract';
import { resourcesFilterEntity } from '@pages/seos-reference/domain/entities/resources/resources-filter.entity';
import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';
import { ResourcesRepository } from '@pages/seos-reference/domain/repositories/resources/resources.repository';
import { resourcesCreateVo } from '@pages/seos-reference/domain/value-objects/resources/resources-create.vo';
import { resourcesDeleteVo } from '@pages/seos-reference/domain/value-objects/resources/resources-delete.vo';
import { resourcesFilterVo } from '@pages/seos-reference/domain/value-objects/resources/resources-filter.vo';
import { resourcesUpdateVo } from '@pages/seos-reference/domain/value-objects/resources/resources-update.vo';
import {
    MessageResponseDto,
    Paginate,
} from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, defer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesUseCase {
    private readonly repository = inject(ResourcesRepository);

    execute(
        contract: ResourcesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<ResourcesEntity>> {
        return defer(() => {
            const vo = resourcesFilterVo(contract);
            const entity = resourcesFilterEntity(vo);
            return this.repository.execute(entity, page, options);
        });
    }

    create(contract: ResourcesCreateContract): Observable<MessageResponseDto> {
        return defer(() => this.repository.create(resourcesCreateVo(contract)));
    }

    update(contract: ResourcesUpdateContract): Observable<MessageResponseDto> {
        return defer(() => this.repository.update(resourcesUpdateVo(contract)));
    }

    delete(contract: ResourcesDeleteContract): Observable<MessageResponseDto> {
        return defer(() => this.repository.delete(resourcesDeleteVo(contract)));
    }
}
