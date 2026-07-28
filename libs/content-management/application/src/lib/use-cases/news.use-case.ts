import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    NewsCreateContract,
    NewsDeleteContract,
    NewsUnpublishContract,
    NewsEntity,
    NewsPublishContract,
    NewsFilterContract,
    NewsRepository,
    NewsUpdateContract,
    newsCreateVo,
    newsDeleteVo,
    newsUnpublishVo,
    newsPublishVo,
    newsFilterVo,
    newsUpdateVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class NewsUseCase {
    private readonly repository = inject(NewsRepository);

    execute(
        contract: NewsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<NewsEntity>> {
        return defer(() =>
            this.repository.execute(newsFilterVo(contract), page, options)
        );
    }

    create(contract: NewsCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(newsCreateVo(contract)));
    }

    update(contract: NewsUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(newsUpdateVo(contract)));
    }

    delete(contract: NewsDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(newsDeleteVo(contract)));
    }

    publish(contract: NewsPublishContract): Observable<MessageEntity> {
        return defer(() => this.repository.publish(newsPublishVo(contract)));
    }

    unpublish(contract: NewsUnpublishContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.unpublish(newsUnpublishVo(contract))
        );
    }
}
