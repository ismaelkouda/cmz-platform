import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    HomeCreateContract,
    HomeDeleteContract,
    HomeDisableContract,
    HomeEntity,
    HomeEnableContract,
    HomeFilterContract,
    HomeUpdateContract,
} from '@cmz/content-management-domain';
import { HomeUseCase } from '../use-cases/home.use-case';

@Service()
export class HomeFacade extends CollectionResourceFacade<
    HomeEntity,
    HomeFilterContract
> {
    private readonly useCase = inject(HomeUseCase);

    protected stream(
        params: PageQuery<HomeFilterContract>
    ): Observable<PageResult<HomeEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: HomeCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: HomeUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: HomeDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: HomeEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: HomeDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
