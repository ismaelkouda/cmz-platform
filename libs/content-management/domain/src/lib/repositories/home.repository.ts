import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { HomeEntity } from '../entities/home.entity';
import { HomeCreateProps } from '../props/home-create.props';
import { HomeUpdateProps } from '../props/home-update.props';
import { HomeDeleteValidateContract } from '../contracts/home-delete.validate-contract';
import { HomeEnableValidateContract } from '../contracts/home-enable.validate-contract';
import { HomeDisableValidateContract } from '../contracts/home-disable.validate-contract';
import { HomeFilterContract } from '../contracts/home-filter.contract';

/**
 * `create`/`update` prennent les Props (déjà transformées : `period`
 * construit via `DatePeriod.create()`), pas le ValidateContract brut — c'est
 * tout le sens de `HomeCreateProps`/`HomeUpdateProps` et de `homeCreateVo`/
 * `homeUpdateVo` (appelés en amont, couche application). Même architecture
 * que le source (`HomeRepository.create(props: HomeCreateProps)`).
 */
export abstract class HomeRepository {
    abstract execute(
        filter: HomeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<HomeEntity>>;
    abstract create(props: HomeCreateProps): Observable<MessageEntity>;
    abstract update(props: HomeUpdateProps): Observable<MessageEntity>;
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
