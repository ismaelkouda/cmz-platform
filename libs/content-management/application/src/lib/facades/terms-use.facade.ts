import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TermsUseCreateContract,
    TermsUseDeleteContract,
    TermsUseUnpublishContract,
    TermsUseEntity,
    TermsUsePublishContract,
    TermsUseFilterContract,
    TermsUseUpdateContract,
} from '@cmz/content-management-domain';
import { TermsUseUseCase } from '../use-cases/terms-use.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class TermsUseFacade extends CollectionResourceFacade<
    TermsUseEntity,
    TermsUseFilterContract
> {
    private readonly useCase = inject(TermsUseUseCase);

    protected stream(
        params: PageQuery<TermsUseFilterContract>
    ): Observable<PageResult<TermsUseEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: TermsUseCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: TermsUseUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: TermsUseDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    publish(contract: TermsUsePublishContract): void {
        this.runAction(
            this.useCase.publish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    unpublish(contract: TermsUseUnpublishContract): void {
        this.runAction(
            this.useCase.unpublish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
