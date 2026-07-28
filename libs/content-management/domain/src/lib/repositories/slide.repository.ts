import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SlideEntity } from '../entities/slide.entity';
import { SlideCreateProps } from '../props/slide-create.props';
import { SlideUpdateProps } from '../props/slide-update.props';
import { SlideDeleteValidateContract } from '../contracts/slide-delete.validate-contract';
import { SlideEnableValidateContract } from '../contracts/slide-enable.validate-contract';
import { SlideDisableValidateContract } from '../contracts/slide-disable.validate-contract';
import { SlideFilterContract } from '../contracts/slide-filter.contract';

/**
 * `create`/`update` prennent les Props (déjà transformées : `period`
 * construit via `DatePeriod.create()`), même architecture que `HomeRepository`.
 */
export abstract class SlideRepository {
    abstract execute(
        filter: SlideFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<SlideEntity>>;
    abstract create(props: SlideCreateProps): Observable<MessageEntity>;
    abstract update(props: SlideUpdateProps): Observable<MessageEntity>;
    abstract delete(
        contract: SlideDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: SlideEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: SlideDisableValidateContract
    ): Observable<MessageEntity>;
}
