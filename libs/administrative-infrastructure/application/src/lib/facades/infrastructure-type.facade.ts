import { Service, inject } from '@angular/core';
import { PAGINATION_CONST } from '@cmz/shared-constants';
import { CollectionFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
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
 * Facade InfrastructureType : liste paginée (signaux) + mutations. Étend
 * `CollectionFacade` du kernel ; ne dépend d'aucune UI (feedback via ports).
 */
@Service()
export class InfrastructureTypeFacade extends CollectionFacade<
    InfrastructureTypeEntity,
    InfrastructureTypeFilterContract
> {
    private readonly useCase = inject(InfrastructureTypeUseCase);

    load(
        filter: InfrastructureTypeFilterContract = {},
        page: string = PAGINATION_CONST.DEFAULT_PAGE,
        options: FetchOptions = {}
    ): void {
        this.fetchPage(
            filter,
            page,
            this.useCase.execute(filter, page, options)
        );
    }

    refresh(): void {
        this.load(this.filter() ?? {}, this.page(), { forceRefresh: true });
    }

    changePage(page: string): void {
        this.load(this.filter() ?? {}, page);
    }

    create(contract: InfrastructureTypeCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.refresh()
        );
    }

    update(contract: InfrastructureTypeUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.refresh()
        );
    }

    delete(contract: InfrastructureTypeDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.refresh()
        );
    }

    enable(contract: InfrastructureTypeEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.refresh()
        );
    }

    disable(contract: InfrastructureTypeDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.refresh()
        );
    }
}
