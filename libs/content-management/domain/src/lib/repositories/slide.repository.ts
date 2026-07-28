import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SlideEntity } from '../entities/slide.entity';
import { SlideCreateValidateContract } from '../contracts/slide-create.validate-contract';
import { SlideUpdateValidateContract } from '../contracts/slide-update.validate-contract';
import { SlideDeleteValidateContract } from '../contracts/slide-delete.validate-contract';
import { SlideEnableValidateContract } from '../contracts/slide-enable.validate-contract';
import { SlideDisableValidateContract } from '../contracts/slide-disable.validate-contract';
import { SlideFilterContract } from '../contracts/slide-filter.contract';

export abstract class SlideRepository {
    abstract execute(
        filter: SlideFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<SlideEntity>>;
    abstract create(
        contract: SlideCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: SlideUpdateValidateContract
    ): Observable<MessageEntity>;
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
