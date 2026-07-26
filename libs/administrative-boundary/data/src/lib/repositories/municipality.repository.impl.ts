import { Service, inject } from '@angular/core';
import {
    MunicipalityCreateValidateContract,
    MunicipalityDeleteValidateContract,
    MunicipalityEntity,
    MunicipalityFilterContract,
    MunicipalityRepository,
    MunicipalityUpdateValidateContract,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { municipalityCreateMapper } from '../mappers/municipality-create.mapper';
import { municipalityDeleteMapper } from '../mappers/municipality-delete.mapper';
import { municipalityFilterMapper } from '../mappers/municipality-filter.mapper';
import { municipalityUpdateMapper } from '../mappers/municipality-update.mapper';
import { MunicipalityMapper } from '../mappers/municipality.mapper';
import { MunicipalityApi } from '../sources/municipality.api';

@Service()
export class MunicipalityRepositoryImpl implements MunicipalityRepository {
    private readonly api = inject(MunicipalityApi);
    private readonly mapper = inject(MunicipalityMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: MunicipalityFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MunicipalityEntity>> {
        return this.api
            .readAll(municipalityFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: MunicipalityCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(municipalityCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: MunicipalityUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(municipalityUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: MunicipalityDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(municipalityDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
