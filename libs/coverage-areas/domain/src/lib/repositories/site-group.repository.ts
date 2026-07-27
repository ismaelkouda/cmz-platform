import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SiteGroupFilterContract } from '../contracts/site-group-filter.contract';
import { SiteGroupCreateValidateContract } from '../contracts/site-group-create.validate-contract';
import { SiteGroupUpdateValidateContract } from '../contracts/site-group-update.validate-contract';
import { SiteGroupDeleteValidateContract } from '../contracts/site-group-delete.validate-contract';
import { SiteGroupEnableValidateContract } from '../contracts/site-group-enable.validate-contract';
import { SiteGroupDisableValidateContract } from '../contracts/site-group-disable.validate-contract';
import { SiteGroupEntity } from '../entities/site-group.entity';

export abstract class SiteGroupRepository {
    abstract execute(
        filter: SiteGroupFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<SiteGroupEntity>>;
    abstract create(
        contract: SiteGroupCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: SiteGroupUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: SiteGroupDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: SiteGroupEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: SiteGroupDisableValidateContract
    ): Observable<MessageEntity>;
}
