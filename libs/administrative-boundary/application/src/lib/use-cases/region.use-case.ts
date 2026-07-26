import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    RegionCreateContract,
    RegionDeleteContract,
    RegionEntity,
    RegionFilterContract,
    RegionRepository,
    RegionUpdateContract,
    regionCreateVo,
    regionDeleteVo,
    regionFilterEntity,
    regionFilterVo,
    regionUpdateVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class RegionUseCase {
    private readonly repository = inject(RegionRepository);

    execute(
        contract: RegionFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RegionEntity>> {
        return defer(() =>
            this.repository.execute(
                regionFilterEntity(regionFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: RegionCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(regionCreateVo(contract)));
    }

    update(contract: RegionUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(regionUpdateVo(contract)));
    }

    delete(contract: RegionDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(regionDeleteVo(contract)));
    }
}
