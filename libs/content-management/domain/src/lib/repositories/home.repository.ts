import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { HomeEntity } from '../entities/home.entity';
import { HomeCreateValidateContract } from '../contracts/home-create.validate-contract';
import { HomeUpdateValidateContract } from '../contracts/home-update.validate-contract';
import { HomeDeleteValidateContract } from '../contracts/home-delete.validate-contract';
import { HomeEnableValidateContract } from '../contracts/home-enable.validate-contract';
import { HomeDisableValidateContract } from '../contracts/home-disable.validate-contract';
import { HomeFilterContract } from '../contracts/home-filter.contract';

export abstract class HomeRepository {
    abstract execute(
        filter: HomeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<HomeEntity>>;
    abstract create(
        contract: HomeCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: HomeUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: HomeDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: HomeEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: HomeDisableValidateContract
    ): Observable<MessageEntity>;
}
