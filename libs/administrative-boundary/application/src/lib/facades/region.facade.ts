import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    RegionCreateContract,
    RegionDeleteContract,
    RegionEntity,
    RegionFilterContract,
    RegionUpdateContract,
} from '@cmz/administrative-boundary-domain';
import { RegionUseCase } from '../use-cases/region.use-case';

@Service()
export class RegionFacade extends CollectionResourceFacade<
    RegionEntity,
    RegionFilterContract
> {
    private readonly useCase = inject(RegionUseCase);

    protected stream(
        params: PageQuery<RegionFilterContract>
    ): Observable<PageResult<RegionEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: RegionCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: RegionUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: RegionDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }
}
