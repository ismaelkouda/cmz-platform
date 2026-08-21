import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    InfrastructureCreateContract,
    InfrastructureDeleteContract,
    InfrastructureEntity,
    InfrastructureFilterContract,
    InfrastructureUpdateContract,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureUseCase } from '../use-cases/infrastructure.use-case';

/**
 * Facade Infrastructure : liste paginée via `rxResource` (signal-first) + mutations.
 * Étend `CollectionResourceFacade` ; aucune dépendance UI (feedback par ports).
 *
 * `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts).
 */
@Service({ autoProvided: false })
export class InfrastructureFacade extends CollectionResourceFacade<
    InfrastructureEntity,
    InfrastructureFilterContract
> {
    private readonly useCase = inject(InfrastructureUseCase);

    protected stream(
        params: PageQuery<InfrastructureFilterContract>
    ): Observable<PageResult<InfrastructureEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: InfrastructureCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: InfrastructureUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: InfrastructureDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }
}
