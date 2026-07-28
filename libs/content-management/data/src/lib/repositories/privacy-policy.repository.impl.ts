import { Service, inject } from '@angular/core';
import {
    PrivacyPolicyCreateValidateContract,
    PrivacyPolicyDeleteValidateContract,
    PrivacyPolicyUnpublishValidateContract,
    PrivacyPolicyEntity,
    PrivacyPolicyFilterContract,
    PrivacyPolicyPublishValidateContract,
    PrivacyPolicyRepository,
    PrivacyPolicyUpdateValidateContract,
} from '@cmz/content-management-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { privacyPolicyCreateMapper } from '../mappers/privacy-policy-create.mapper';
import { privacyPolicyUpdateMapper } from '../mappers/privacy-policy-update.mapper';
import { privacyPolicyDeleteMapper } from '../mappers/privacy-policy-delete.mapper';
import { privacyPolicyPublishMapper } from '../mappers/privacy-policy-publish.mapper';
import { privacyPolicyUnpublishMapper } from '../mappers/privacy-policy-unpublish.mapper';
import { privacyPolicyFilterMapper } from '../mappers/privacy-policy-filter.mapper';
import { PrivacyPolicyMapper } from '../mappers/privacy-policy.mapper';
import { PrivacyPolicyApi } from '../sources/privacy-policy.api';

@Service()
export class PrivacyPolicyRepositoryImpl implements PrivacyPolicyRepository {
    private readonly api = inject(PrivacyPolicyApi);
    private readonly mapper = inject(PrivacyPolicyMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: PrivacyPolicyFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<PrivacyPolicyEntity>> {
        return this.api
            .readAll(privacyPolicyFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: PrivacyPolicyCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(privacyPolicyCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: PrivacyPolicyUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(privacyPolicyUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: PrivacyPolicyDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(privacyPolicyDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    publish(
        validContract: PrivacyPolicyPublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .publish(privacyPolicyPublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    unpublish(
        validContract: PrivacyPolicyUnpublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .unpublish(privacyPolicyUnpublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
