import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    LegalNoticeCreateContract,
    LegalNoticeDeleteContract,
    LegalNoticeUnpublishContract,
    LegalNoticeEntity,
    LegalNoticePublishContract,
    LegalNoticeFilterContract,
    LegalNoticeRepository,
    LegalNoticeUpdateContract,
    legalNoticeCreateVo,
    legalNoticeDeleteVo,
    legalNoticeUnpublishVo,
    legalNoticePublishVo,
    legalNoticeFilterVo,
    legalNoticeUpdateVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class LegalNoticeUseCase {
    private readonly repository = inject(LegalNoticeRepository);

    execute(
        contract: LegalNoticeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<LegalNoticeEntity>> {
        return defer(() =>
            this.repository.execute(
                legalNoticeFilterVo(contract),
                page,
                options
            )
        );
    }

    create(contract: LegalNoticeCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(legalNoticeCreateVo(contract))
        );
    }

    update(contract: LegalNoticeUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(legalNoticeUpdateVo(contract))
        );
    }

    delete(contract: LegalNoticeDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(legalNoticeDeleteVo(contract))
        );
    }

    publish(contract: LegalNoticePublishContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.publish(legalNoticePublishVo(contract))
        );
    }

    unpublish(
        contract: LegalNoticeUnpublishContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.unpublish(legalNoticeUnpublishVo(contract))
        );
    }
}
