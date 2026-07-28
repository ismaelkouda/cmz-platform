import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TermsUseEntity } from '../entities/terms-use.entity';
import { TermsUseCreateValidateContract } from '../contracts/terms-use-create.validate-contract';
import { TermsUseUpdateValidateContract } from '../contracts/terms-use-update.validate-contract';
import { TermsUseDeleteValidateContract } from '../contracts/terms-use-delete.validate-contract';
import { TermsUsePublishValidateContract } from '../contracts/terms-use-publish.validate-contract';
import { TermsUseUnpublishValidateContract } from '../contracts/terms-use-unpublish.validate-contract';
import { TermsUseFilterContract } from '../contracts/terms-use-filter.contract';

export abstract class TermsUseRepository {
    abstract execute(
        filter: TermsUseFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TermsUseEntity>>;
    abstract create(
        contract: TermsUseCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: TermsUseUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: TermsUseDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract publish(
        contract: TermsUsePublishValidateContract
    ): Observable<MessageEntity>;
    abstract unpublish(
        contract: TermsUseUnpublishValidateContract
    ): Observable<MessageEntity>;
}
