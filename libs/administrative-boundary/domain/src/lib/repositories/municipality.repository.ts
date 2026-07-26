import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MunicipalityFilterContract } from '../contracts/municipality-filter.contract';
import { MunicipalityCreateValidateContract } from '../contracts/municipality-create.validate-contract';
import { MunicipalityUpdateValidateContract } from '../contracts/municipality-update.validate-contract';
import { MunicipalityDeleteValidateContract } from '../contracts/municipality-delete.validate-contract';
import { MunicipalityEntity } from '../entities/municipality.entity';

/** Port `municipality` — CRUD seul, pas de toggle (aucun enable/disable source). */
export abstract class MunicipalityRepository {
    abstract execute(
        filter: MunicipalityFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MunicipalityEntity>>;
    abstract create(
        contract: MunicipalityCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: MunicipalityUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: MunicipalityDeleteValidateContract
    ): Observable<MessageEntity>;
}
