import { Service, inject } from '@angular/core';
import {
    TeamsCreateValidateContract,
    TeamsDeleteValidateContract,
    TeamsDisableValidateContract,
    TeamsEnableValidateContract,
    TeamsEntity,
    TeamsFilterContract,
    TeamsRepository,
    TeamsUpdateValidateContract,
} from '@cmz/team-organization-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { teamsCreateMapper } from '../mappers/teams-create.mapper';
import { teamsUpdateMapper } from '../mappers/teams-update.mapper';
import { teamsDeleteMapper } from '../mappers/teams-delete.mapper';
import { teamsEnableMapper } from '../mappers/teams-enable.mapper';
import { teamsDisableMapper } from '../mappers/teams-disable.mapper';
import { teamsFilterMapper } from '../mappers/teams-filter.mapper';
import { TeamsMapper } from '../mappers/teams.mapper';
import { TeamsApi } from '../sources/teams.api';

@Service()
export class TeamsRepositoryImpl implements TeamsRepository {
    private readonly api = inject(TeamsApi);
    private readonly mapper = inject(TeamsMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: TeamsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TeamsEntity>> {
        return this.api
            .readAll(teamsFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: TeamsCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(teamsCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: TeamsUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(teamsUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: TeamsDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(teamsDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: TeamsEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(teamsEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: TeamsDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(teamsDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
