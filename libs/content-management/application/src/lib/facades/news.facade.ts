import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    NewsCreateContract,
    NewsDeleteContract,
    NewsUnpublishContract,
    NewsEntity,
    NewsPublishContract,
    NewsFilterContract,
    NewsUpdateContract,
} from '@cmz/content-management-domain';
import { NewsUseCase } from '../use-cases/news.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class NewsFacade extends CollectionResourceFacade<
    NewsEntity,
    NewsFilterContract
> {
    private readonly useCase = inject(NewsUseCase);

    protected stream(
        params: PageQuery<NewsFilterContract>
    ): Observable<PageResult<NewsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: NewsCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: NewsUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: NewsDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    publish(contract: NewsPublishContract): void {
        this.runAction(
            this.useCase.publish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    unpublish(contract: NewsUnpublishContract): void {
        this.runAction(
            this.useCase.unpublish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
