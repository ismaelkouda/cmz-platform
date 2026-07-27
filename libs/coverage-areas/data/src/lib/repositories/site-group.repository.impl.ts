import { Service, inject } from '@angular/core';
import {
    SiteGroupCreateValidateContract,
    SiteGroupDeleteValidateContract,
    SiteGroupEntity,
    SiteGroupFilterContract,
    SiteGroupRepository,
    SiteGroupUpdateValidateContract,
    SiteGroupEnableValidateContract,
    SiteGroupDisableValidateContract,
} from '@cmz/coverage-areas-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { siteGroupCreateMapper } from '../mappers/site-group-create.mapper';
import { siteGroupDeleteMapper } from '../mappers/site-group-delete.mapper';
import { siteGroupFilterMapper } from '../mappers/site-group-filter.mapper';
import { siteGroupUpdateMapper } from '../mappers/site-group-update.mapper';
import { siteGroupEnableMapper } from '../mappers/site-group-enable.mapper';
import { siteGroupDisableMapper } from '../mappers/site-group-disable.mapper';
import { SiteGroupMapper } from '../mappers/site-group.mapper';
import { SiteGroupApi } from '../sources/site-group.api';

@Service()
export class SiteGroupRepositoryImpl implements SiteGroupRepository {
    private readonly api = inject(SiteGroupApi);
    private readonly mapper = inject(SiteGroupMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: SiteGroupFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<SiteGroupEntity>> {
        return this.api
            .readAll(siteGroupFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: SiteGroupCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(siteGroupCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: SiteGroupUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(siteGroupUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: SiteGroupDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(siteGroupDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: SiteGroupEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(siteGroupEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: SiteGroupDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(siteGroupDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
