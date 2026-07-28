import { Service, inject } from '@angular/core';
import {
    NewsCreateValidateContract,
    NewsDeleteValidateContract,
    NewsUnpublishValidateContract,
    NewsEntity,
    NewsFilterContract,
    NewsPublishValidateContract,
    NewsRepository,
    NewsUpdateValidateContract,
} from '@cmz/content-management-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { newsCreateMapper } from '../mappers/news-create.mapper';
import { newsUpdateMapper } from '../mappers/news-update.mapper';
import { newsDeleteMapper } from '../mappers/news-delete.mapper';
import { newsPublishMapper } from '../mappers/news-publish.mapper';
import { newsUnpublishMapper } from '../mappers/news-unpublish.mapper';
import { newsFilterMapper } from '../mappers/news-filter.mapper';
import { NewsMapper } from '../mappers/news.mapper';
import { NewsApi } from '../sources/news.api';

@Service()
export class NewsRepositoryImpl implements NewsRepository {
    private readonly api = inject(NewsApi);
    private readonly mapper = inject(NewsMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: NewsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<NewsEntity>> {
        return this.api
            .readAll(newsFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: NewsCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(newsCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: NewsUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(newsUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: NewsDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(newsDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    publish(
        validContract: NewsPublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .publish(newsPublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    unpublish(
        validContract: NewsUnpublishValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .unpublish(newsUnpublishMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
