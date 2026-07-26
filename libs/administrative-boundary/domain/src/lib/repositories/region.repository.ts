import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { RegionFilterContract } from '../contracts/region-filter.contract';
import { RegionCreateValidateContract } from '../contracts/region-create.validate-contract';
import { RegionUpdateValidateContract } from '../contracts/region-update.validate-contract';
import { RegionDeleteValidateContract } from '../contracts/region-delete.validate-contract';
import { RegionEntity } from '../entities/region.entity';

/** Port `region` — CRUD seul, pas de toggle (aucun enable/disable source). */
export abstract class RegionRepository {
    abstract execute(
        filter: RegionFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RegionEntity>>;
    abstract create(
        contract: RegionCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: RegionUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: RegionDeleteValidateContract
    ): Observable<MessageEntity>;
}
