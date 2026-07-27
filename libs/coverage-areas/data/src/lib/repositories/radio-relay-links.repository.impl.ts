import { Service, inject } from '@angular/core';
import {
    RadioRelayLinksCreateValidateContract,
    RadioRelayLinksDeleteValidateContract,
    RadioRelayLinksEntity,
    RadioRelayLinksFilterContract,
    RadioRelayLinksRepository,
    RadioRelayLinksUpdateValidateContract,
    RadioRelayLinksEnableValidateContract,
    RadioRelayLinksDisableValidateContract,
} from '@cmz/coverage-areas-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { radioRelayLinksCreateMapper } from '../mappers/radio-relay-links-create.mapper';
import { radioRelayLinksDeleteMapper } from '../mappers/radio-relay-links-delete.mapper';
import { radioRelayLinksFilterMapper } from '../mappers/radio-relay-links-filter.mapper';
import { radioRelayLinksUpdateMapper } from '../mappers/radio-relay-links-update.mapper';
import { radioRelayLinksEnableMapper } from '../mappers/radio-relay-links-enable.mapper';
import { radioRelayLinksDisableMapper } from '../mappers/radio-relay-links-disable.mapper';
import { RadioRelayLinksMapper } from '../mappers/radio-relay-links.mapper';
import { RadioRelayLinksApi } from '../sources/radio-relay-links.api';

@Service()
export class RadioRelayLinksRepositoryImpl implements RadioRelayLinksRepository {
    private readonly api = inject(RadioRelayLinksApi);
    private readonly mapper = inject(RadioRelayLinksMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: RadioRelayLinksFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RadioRelayLinksEntity>> {
        return this.api
            .readAll(radioRelayLinksFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: RadioRelayLinksCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(radioRelayLinksCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: RadioRelayLinksUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(radioRelayLinksUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: RadioRelayLinksDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(radioRelayLinksDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: RadioRelayLinksEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(radioRelayLinksEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: RadioRelayLinksDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(radioRelayLinksDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
