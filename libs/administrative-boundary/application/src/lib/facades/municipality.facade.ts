import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    MunicipalityCreateContract,
    MunicipalityDeleteContract,
    MunicipalityEntity,
    MunicipalityFilterContract,
    MunicipalityUpdateContract,
} from '@cmz/administrative-boundary-domain';
import { MunicipalityUseCase } from '../use-cases/municipality.use-case';

@Service()
export class MunicipalityFacade extends CollectionResourceFacade<
    MunicipalityEntity,
    MunicipalityFilterContract
> {
    private readonly useCase = inject(MunicipalityUseCase);

    protected stream(
        params: PageQuery<MunicipalityFilterContract>
    ): Observable<PageResult<MunicipalityEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: MunicipalityCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: MunicipalityUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: MunicipalityDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }
}
