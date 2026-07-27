import { Service, inject } from '@angular/core';
import {
    OpticalFiberNetworkCreateValidateContract,
    OpticalFiberNetworkDeleteValidateContract,
    OpticalFiberNetworkEntity,
    OpticalFiberNetworkFilterContract,
    OpticalFiberNetworkRepository,
    OpticalFiberNetworkUpdateValidateContract,
    OpticalFiberNetworkEnableValidateContract,
    OpticalFiberNetworkDisableValidateContract,
} from '@cmz/coverage-areas-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { opticalFiberNetworkCreateMapper } from '../mappers/optical-fiber-network-create.mapper';
import { opticalFiberNetworkDeleteMapper } from '../mappers/optical-fiber-network-delete.mapper';
import { opticalFiberNetworkFilterMapper } from '../mappers/optical-fiber-network-filter.mapper';
import { opticalFiberNetworkUpdateMapper } from '../mappers/optical-fiber-network-update.mapper';
import { opticalFiberNetworkEnableMapper } from '../mappers/optical-fiber-network-enable.mapper';
import { opticalFiberNetworkDisableMapper } from '../mappers/optical-fiber-network-disable.mapper';
import { OpticalFiberNetworkMapper } from '../mappers/optical-fiber-network.mapper';
import { OpticalFiberNetworkApi } from '../sources/optical-fiber-network.api';

@Service()
export class OpticalFiberNetworkRepositoryImpl implements OpticalFiberNetworkRepository {
    private readonly api = inject(OpticalFiberNetworkApi);
    private readonly mapper = inject(OpticalFiberNetworkMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: OpticalFiberNetworkFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<OpticalFiberNetworkEntity>> {
        return this.api
            .readAll(
                opticalFiberNetworkFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: OpticalFiberNetworkCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(opticalFiberNetworkCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: OpticalFiberNetworkUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(opticalFiberNetworkUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: OpticalFiberNetworkDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(opticalFiberNetworkDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: OpticalFiberNetworkEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(opticalFiberNetworkEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: OpticalFiberNetworkDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(opticalFiberNetworkDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
