import { Service, inject } from '@angular/core';
import {
    LegalNoticeCreateValidateContract,
    LegalNoticeDeleteValidateContract,
    LegalNoticeUnpublishValidateContract,
    LegalNoticeEntity,
    LegalNoticeFilterContract,
    LegalNoticePublishValidateContract,
    LegalNoticeRepository,
    LegalNoticeUpdateValidateContract,
} from '@cmz/content-management-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { legalNoticeCreateMapper } from '../mappers/legal-notice-create.mapper';
import { legalNoticeUpdateMapper } from '../mappers/legal-notice-update.mapper';
import { legalNoticeDeleteMapper } from '../mappers/legal-notice-delete.mapper';
import { legalNoticePublishMapper } from '../mappers/legal-notice-publish.mapper';
import { legalNoticeUnpublishMapper } from '../mappers/legal-notice-unpublish.mapper';
import { legalNoticeFilterMapper } from '../mappers/legal-notice-filter.mapper';
import { LegalNoticeMapper } from '../mappers/legal-notice.mapper';
import { LegalNoticeApi } from '../sources/legal-notice.api';

@Service()
export class LegalNoticeRepositoryImpl implements LegalNoticeRepository {
    private readonly api = inject(LegalNoticeApi);
    private readonly mapper = inject(LegalNoticeMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: LegalNoticeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<LegalNoticeEntity>> {
        return this.api
            .readAll(legalNoticeFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: LegalNoticeCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(legalNoticeCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: LegalNoticeUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(legalNoticeUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: LegalNoticeDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(legalNoticeDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    publish(
        validContract: LegalNoticePublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .publish(legalNoticePublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    unpublish(
        validContract: LegalNoticeUnpublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .unpublish(legalNoticeUnpublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
