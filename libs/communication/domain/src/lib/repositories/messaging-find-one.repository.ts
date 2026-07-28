import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MessagingFindOneFilterValidateContract } from '../contracts/messaging-find-one-filter.validate-contract';
import { MessagingFindOneEntity } from '../entities/messaging-find-one.entity';

export abstract class MessagingFindOneRepository {
    abstract execute(
        filter: MessagingFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<MessagingFindOneEntity>;
}
