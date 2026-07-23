import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    InfrastructureTypeCreateContract,
    InfrastructureTypeDeleteContract,
    InfrastructureTypeDisableContract,
    InfrastructureTypeEnableContract,
    InfrastructureTypeEntity,
    InfrastructureTypeFilterContract,
    InfrastructureTypeUpdateContract,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeUseCase } from '../use-cases/infrastructure-type.use-case';

/**
 * Facade InfrastructureType : liste paginée via `rxResource` (signal-first) + mutations.
 * Étend `CollectionResourceFacade` ; aucune dépendance UI (feedback par ports).
 */
@Service()
export class InfrastructureTypeFacade extends CollectionResourceFacade<
    InfrastructureTypeEntity,
    InfrastructureTypeFilterContract
> {
    private readonly useCase = inject(InfrastructureTypeUseCase);

    protected stream(
        params: PageQuery<InfrastructureTypeFilterContract>
    ): Observable<PageResult<InfrastructureTypeEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: InfrastructureTypeCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: InfrastructureTypeUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: InfrastructureTypeDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: InfrastructureTypeEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: InfrastructureTypeDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
