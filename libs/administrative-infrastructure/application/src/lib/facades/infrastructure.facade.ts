import { Service, inject } from '@angular/core';
import { PAGINATION_CONST } from '@cmz/shared-constants';
import { CollectionFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureCreateContract,
    InfrastructureDeleteContract,
    InfrastructureEntity,
    InfrastructureFilterContract,
    InfrastructureUpdateContract,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureUseCase } from '../use-cases/infrastructure.use-case';

/**
 * Facade Infrastructure : liste paginée (signaux) + mutations. Étend
 * `CollectionFacade` du kernel ; ne dépend d'aucune UI (feedback via ports).
 */
@Service()
export class InfrastructureFacade extends CollectionFacade<
    InfrastructureEntity,
    InfrastructureFilterContract
> {
    private readonly useCase = inject(InfrastructureUseCase);

    load(
        filter: InfrastructureFilterContract = {},
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

    create(contract: InfrastructureCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.refresh()
        );
    }

    update(contract: InfrastructureUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.refresh()
        );
    }

    delete(contract: InfrastructureDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.refresh()
        );
    }
}
