import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { LegalNoticeEntity } from '../entities/legal-notice.entity';
import { LegalNoticeCreateValidateContract } from '../contracts/legal-notice-create.validate-contract';
import { LegalNoticeUpdateValidateContract } from '../contracts/legal-notice-update.validate-contract';
import { LegalNoticeDeleteValidateContract } from '../contracts/legal-notice-delete.validate-contract';
import { LegalNoticePublishValidateContract } from '../contracts/legal-notice-publish.validate-contract';
import { LegalNoticeUnpublishValidateContract } from '../contracts/legal-notice-unpublish.validate-contract';
import { LegalNoticeFilterContract } from '../contracts/legal-notice-filter.contract';

export abstract class LegalNoticeRepository {
    abstract execute(
        filter: LegalNoticeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<LegalNoticeEntity>>;
    abstract create(
        contract: LegalNoticeCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: LegalNoticeUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: LegalNoticeDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract publish(
        contract: LegalNoticePublishValidateContract
    ): Observable<MessageEntity>;
    abstract unpublish(
        contract: LegalNoticeUnpublishValidateContract
    ): Observable<MessageEntity>;
}
