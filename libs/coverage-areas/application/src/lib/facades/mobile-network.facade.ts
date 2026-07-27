import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    MobileNetworkCreateContract,
    MobileNetworkDeleteContract,
    MobileNetworkDisableContract,
    MobileNetworkEnableContract,
    MobileNetworkEntity,
    MobileNetworkFilterContract,
    MobileNetworkUpdateContract,
} from '@cmz/coverage-areas-domain';
import { MobileNetworkUseCase } from '../use-cases/mobile-network.use-case';

@Service()
export class MobileNetworkFacade extends CollectionResourceFacade<
    MobileNetworkEntity,
    MobileNetworkFilterContract
> {
    private readonly useCase = inject(MobileNetworkUseCase);

    protected stream(
        params: PageQuery<MobileNetworkFilterContract>
    ): Observable<PageResult<MobileNetworkEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: MobileNetworkCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: MobileNetworkUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: MobileNetworkDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: MobileNetworkEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: MobileNetworkDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
