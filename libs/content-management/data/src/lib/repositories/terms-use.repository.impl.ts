import { Service, inject } from '@angular/core';
import {
    TermsUseCreateValidateContract,
    TermsUseDeleteValidateContract,
    TermsUseUnpublishValidateContract,
    TermsUseEntity,
    TermsUseFilterContract,
    TermsUsePublishValidateContract,
    TermsUseRepository,
    TermsUseUpdateValidateContract,
} from '@cmz/content-management-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { termsUseCreateMapper } from '../mappers/terms-use-create.mapper';
import { termsUseUpdateMapper } from '../mappers/terms-use-update.mapper';
import { termsUseDeleteMapper } from '../mappers/terms-use-delete.mapper';
import { termsUsePublishMapper } from '../mappers/terms-use-publish.mapper';
import { termsUseUnpublishMapper } from '../mappers/terms-use-unpublish.mapper';
import { termsUseFilterMapper } from '../mappers/terms-use-filter.mapper';
import { TermsUseMapper } from '../mappers/terms-use.mapper';
import { TermsUseApi } from '../sources/terms-use.api';

@Service()
export class TermsUseRepositoryImpl implements TermsUseRepository {
    private readonly api = inject(TermsUseApi);
    private readonly mapper = inject(TermsUseMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: TermsUseFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TermsUseEntity>> {
        return this.api
            .readAll(termsUseFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: TermsUseCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(termsUseCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: TermsUseUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(termsUseUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: TermsUseDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(termsUseDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    publish(
        validContract: TermsUsePublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .publish(termsUsePublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    unpublish(
        validContract: TermsUseUnpublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .unpublish(termsUseUnpublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
