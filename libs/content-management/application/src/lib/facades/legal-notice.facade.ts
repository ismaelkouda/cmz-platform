import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    LegalNoticeCreateContract,
    LegalNoticeDeleteContract,
    LegalNoticeUnpublishContract,
    LegalNoticeEntity,
    LegalNoticePublishContract,
    LegalNoticeFilterContract,
    LegalNoticeUpdateContract,
} from '@cmz/content-management-domain';
import { LegalNoticeUseCase } from '../use-cases/legal-notice.use-case';

@Service()
export class LegalNoticeFacade extends CollectionResourceFacade<
    LegalNoticeEntity,
    LegalNoticeFilterContract
> {
    private readonly useCase = inject(LegalNoticeUseCase);

    protected stream(
        params: PageQuery<LegalNoticeFilterContract>
    ): Observable<PageResult<LegalNoticeEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: LegalNoticeCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: LegalNoticeUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: LegalNoticeDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    publish(contract: LegalNoticePublishContract): void {
        this.runAction(
            this.useCase.publish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    unpublish(contract: LegalNoticeUnpublishContract): void {
        this.runAction(
            this.useCase.unpublish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
