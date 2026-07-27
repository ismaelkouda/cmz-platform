import { Service, inject } from '@angular/core';
import {
    MobileNetworkCreateValidateContract,
    MobileNetworkDeleteValidateContract,
    MobileNetworkEntity,
    MobileNetworkFilterContract,
    MobileNetworkRepository,
    MobileNetworkUpdateValidateContract,
    MobileNetworkEnableValidateContract,
    MobileNetworkDisableValidateContract,
} from '@cmz/coverage-areas-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { mobileNetworkCreateMapper } from '../mappers/mobile-network-create.mapper';
import { mobileNetworkDeleteMapper } from '../mappers/mobile-network-delete.mapper';
import { mobileNetworkFilterMapper } from '../mappers/mobile-network-filter.mapper';
import { mobileNetworkUpdateMapper } from '../mappers/mobile-network-update.mapper';
import { mobileNetworkEnableMapper } from '../mappers/mobile-network-enable.mapper';
import { mobileNetworkDisableMapper } from '../mappers/mobile-network-disable.mapper';
import { MobileNetworkMapper } from '../mappers/mobile-network.mapper';
import { MobileNetworkApi } from '../sources/mobile-network.api';

@Service()
export class MobileNetworkRepositoryImpl implements MobileNetworkRepository {
    private readonly api = inject(MobileNetworkApi);
    private readonly mapper = inject(MobileNetworkMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: MobileNetworkFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MobileNetworkEntity>> {
        return this.api
            .readAll(mobileNetworkFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: MobileNetworkCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(mobileNetworkCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: MobileNetworkUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(mobileNetworkUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: MobileNetworkDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(mobileNetworkDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: MobileNetworkEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(mobileNetworkEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: MobileNetworkDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(mobileNetworkDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
