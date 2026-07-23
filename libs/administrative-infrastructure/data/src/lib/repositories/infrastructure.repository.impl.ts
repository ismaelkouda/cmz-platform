import { Service, inject } from '@angular/core';
import {
    InfrastructureCreateValidateContract,
    InfrastructureDeleteValidateContract,
    InfrastructureEntity,
    InfrastructureFilterContract,
    InfrastructureRepository,
    InfrastructureUpdateValidateContract,
} from '@cmz/administrative-infrastructure-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { infrastructureCreateMapper } from '../mappers/infrastructure-create.mapper';
import { infrastructureDeleteMapper } from '../mappers/infrastructure-delete.mapper';
import { infrastructureFilterMapper } from '../mappers/infrastructure-filter.mapper';
import { infrastructureUpdateMapper } from '../mappers/infrastructure-update.mapper';
import { InfrastructureMapper } from '../mappers/infrastructure.mapper';
import { InfrastructureApi } from '../sources/infrastructure.api';

@Service()
export class InfrastructureRepositoryImpl implements InfrastructureRepository {
    private readonly api = inject(InfrastructureApi);
    private readonly mapper = inject(InfrastructureMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: InfrastructureFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<InfrastructureEntity>> {
        return this.api
            .readAll(infrastructureFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: InfrastructureCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(infrastructureCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: InfrastructureUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(infrastructureUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: InfrastructureDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(infrastructureDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
