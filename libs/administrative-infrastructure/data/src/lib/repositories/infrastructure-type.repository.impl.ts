import { Service, inject } from '@angular/core';
import {
    InfrastructureTypeCreateValidateContract,
    InfrastructureTypeDeleteValidateContract,
    InfrastructureTypeEntity,
    InfrastructureTypeFilterContract,
    InfrastructureTypeRepository,
    InfrastructureTypeUpdateValidateContract,
    InfrastructureTypeEnableValidateContract,
    InfrastructureTypeDisableValidateContract,
} from '@cmz/administrative-infrastructure-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { infrastructureTypeCreateMapper } from '../mappers/infrastructure-type-create.mapper';
import { infrastructureTypeDeleteMapper } from '../mappers/infrastructure-type-delete.mapper';
import { infrastructureTypeFilterMapper } from '../mappers/infrastructure-type-filter.mapper';
import { infrastructureTypeUpdateMapper } from '../mappers/infrastructure-type-update.mapper';
import { infrastructureTypeEnableMapper } from '../mappers/infrastructure-type-enable.mapper';
import { infrastructureTypeDisableMapper } from '../mappers/infrastructure-type-disable.mapper';
import { InfrastructureTypeMapper } from '../mappers/infrastructure-type.mapper';
import { InfrastructureTypeApi } from '../sources/infrastructure-type.api';

@Service()
export class InfrastructureTypeRepositoryImpl implements InfrastructureTypeRepository {
    private readonly api = inject(InfrastructureTypeApi);
    private readonly mapper = inject(InfrastructureTypeMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: InfrastructureTypeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<InfrastructureTypeEntity>> {
        return this.api
            .readAll(
                infrastructureTypeFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: InfrastructureTypeCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(infrastructureTypeCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: InfrastructureTypeUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(infrastructureTypeUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: InfrastructureTypeDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(infrastructureTypeDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: InfrastructureTypeEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(infrastructureTypeEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: InfrastructureTypeDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(infrastructureTypeDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
