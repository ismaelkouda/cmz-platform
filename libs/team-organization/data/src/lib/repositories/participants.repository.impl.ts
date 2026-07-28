import { Service, inject } from '@angular/core';
import {
    ParticipantsCreateValidateContract,
    ParticipantsDeleteValidateContract,
    ParticipantsDisableValidateContract,
    ParticipantsEnableValidateContract,
    ParticipantsEntity,
    ParticipantsFilterContract,
    ParticipantsRepository,
    ParticipantsUpdateValidateContract,
} from '@cmz/team-organization-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { participantsDeleteMapper } from '../mappers/participants-delete.mapper';
import { participantsEnableMapper } from '../mappers/participants-enable.mapper';
import { participantsDisableMapper } from '../mappers/participants-disable.mapper';
import { ParticipantsFilterMapper } from '../mappers/participants-filter.mapper';
import { ParticipantsCreateMapper } from '../mappers/participants-create.mapper';
import { ParticipantsUpdateMapper } from '../mappers/participants-update.mapper';
import { ParticipantsMapper } from '../mappers/participants.mapper';
import { ParticipantsApi } from '../sources/participants.api';

@Service()
export class ParticipantsRepositoryImpl implements ParticipantsRepository {
    private readonly api = inject(ParticipantsApi);
    private readonly mapper = inject(ParticipantsMapper);
    private readonly messageMapper = inject(MessageResultMapper);
    private readonly filterMapper = inject(ParticipantsFilterMapper);
    private readonly createMapper = inject(ParticipantsCreateMapper);
    private readonly updateMapper = inject(ParticipantsUpdateMapper);

    execute(
        filter: ParticipantsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ParticipantsEntity>> {
        return this.api
            .readAll(this.filterMapper.mapContractToApi(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: ParticipantsCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(this.createMapper.mapEntityToApi(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: ParticipantsUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(this.updateMapper.mapEntityToApi(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: ParticipantsDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(participantsDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: ParticipantsEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(participantsEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: ParticipantsDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(participantsDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
