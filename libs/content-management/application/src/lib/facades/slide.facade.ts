import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    SlideCreateContract,
    SlideDeleteContract,
    SlideDisableContract,
    SlideEntity,
    SlideEnableContract,
    SlideFilterContract,
    SlideUpdateContract,
} from '@cmz/content-management-domain';
import { SlideUseCase } from '../use-cases/slide.use-case';

@Service()
export class SlideFacade extends CollectionResourceFacade<
    SlideEntity,
    SlideFilterContract
> {
    private readonly useCase = inject(SlideUseCase);

    protected stream(
        params: PageQuery<SlideFilterContract>
    ): Observable<PageResult<SlideEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: SlideCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: SlideUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: SlideDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: SlideEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: SlideDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
