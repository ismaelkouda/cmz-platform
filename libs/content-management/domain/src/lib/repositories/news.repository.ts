import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { NewsEntity } from '../entities/news.entity';
import { NewsCreateValidateContract } from '../contracts/news-create.validate-contract';
import { NewsUpdateValidateContract } from '../contracts/news-update.validate-contract';
import { NewsDeleteValidateContract } from '../contracts/news-delete.validate-contract';
import { NewsPublishValidateContract } from '../contracts/news-publish.validate-contract';
import { NewsUnpublishValidateContract } from '../contracts/news-unpublish.validate-contract';
import { NewsFilterContract } from '../contracts/news-filter.contract';

export abstract class NewsRepository {
    abstract execute(
        filter: NewsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<NewsEntity>>;
    abstract create(
        contract: NewsCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: NewsUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: NewsDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract publish(
        contract: NewsPublishValidateContract
    ): Observable<MessageEntity>;
    abstract unpublish(
        contract: NewsUnpublishValidateContract
    ): Observable<MessageEntity>;
}
