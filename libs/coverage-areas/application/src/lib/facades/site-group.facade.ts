import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    SiteGroupCreateContract,
    SiteGroupDeleteContract,
    SiteGroupDisableContract,
    SiteGroupEnableContract,
    SiteGroupEntity,
    SiteGroupFilterContract,
    SiteGroupUpdateContract,
} from '@cmz/coverage-areas-domain';
import { SiteGroupUseCase } from '../use-cases/site-group.use-case';

/**
 * Facade SiteGroup : liste paginée via `rxResource` (signal-first) + mutations.
 * Étend `CollectionResourceFacade` ; aucune dépendance UI (feedback par ports).
 */
/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class SiteGroupFacade extends CollectionResourceFacade<
    SiteGroupEntity,
    SiteGroupFilterContract
> {
    private readonly useCase = inject(SiteGroupUseCase);

    protected stream(
        params: PageQuery<SiteGroupFilterContract>
    ): Observable<PageResult<SiteGroupEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: SiteGroupCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: SiteGroupUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: SiteGroupDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: SiteGroupEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: SiteGroupDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
