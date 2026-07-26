import { Service, inject } from '@angular/core';
import {
    RegionCreateValidateContract,
    RegionDeleteValidateContract,
    RegionEntity,
    RegionFilterContract,
    RegionRepository,
    RegionUpdateValidateContract,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { regionCreateMapper } from '../mappers/region-create.mapper';
import { regionDeleteMapper } from '../mappers/region-delete.mapper';
import { regionFilterMapper } from '../mappers/region-filter.mapper';
import { regionUpdateMapper } from '../mappers/region-update.mapper';
import { RegionMapper } from '../mappers/region.mapper';
import { RegionApi } from '../sources/region.api';

@Service()
export class RegionRepositoryImpl implements RegionRepository {
    private readonly api = inject(RegionApi);
    private readonly mapper = inject(RegionMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: RegionFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RegionEntity>> {
        return this.api
            .readAll(regionFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: RegionCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(regionCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: RegionUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(regionUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: RegionDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(regionDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
