import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { NewsFindOneEntity } from '../entities/news-find-one.entity';
import { NewsFindOneFilterValidateContract } from '../contracts/news-find-one-filter.validate-contract';

export abstract class NewsFindOneRepository {
    abstract execute(
        filter: NewsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<NewsFindOneEntity>;
}
