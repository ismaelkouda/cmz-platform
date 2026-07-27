import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    OpticalFiberNetworkCreateContract,
    OpticalFiberNetworkDeleteContract,
    OpticalFiberNetworkDisableContract,
    OpticalFiberNetworkEnableContract,
    OpticalFiberNetworkEntity,
    OpticalFiberNetworkFilterContract,
    OpticalFiberNetworkUpdateContract,
} from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkUseCase } from '../use-cases/optical-fiber-network.use-case';

@Service()
export class OpticalFiberNetworkFacade extends CollectionResourceFacade<
    OpticalFiberNetworkEntity,
    OpticalFiberNetworkFilterContract
> {
    private readonly useCase = inject(OpticalFiberNetworkUseCase);

    protected stream(
        params: PageQuery<OpticalFiberNetworkFilterContract>
    ): Observable<PageResult<OpticalFiberNetworkEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: OpticalFiberNetworkCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: OpticalFiberNetworkUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: OpticalFiberNetworkDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: OpticalFiberNetworkEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: OpticalFiberNetworkDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
