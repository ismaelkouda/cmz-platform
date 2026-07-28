import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TeamsFilterContract } from '../contracts/teams-filter.contract';
import { TeamsCreateValidateContract } from '../contracts/teams-create.validate-contract';
import { TeamsUpdateValidateContract } from '../contracts/teams-update.validate-contract';
import { TeamsDeleteValidateContract } from '../contracts/teams-delete.validate-contract';
import { TeamsEnableValidateContract } from '../contracts/teams-enable.validate-contract';
import { TeamsDisableValidateContract } from '../contracts/teams-disable.validate-contract';
import { TeamsEntity } from '../entities/teams.entity';

export abstract class TeamsRepository {
    abstract execute(
        filter: TeamsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TeamsEntity>>;
    abstract create(
        contract: TeamsCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: TeamsUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: TeamsDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: TeamsEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: TeamsDisableValidateContract
    ): Observable<MessageEntity>;
}
