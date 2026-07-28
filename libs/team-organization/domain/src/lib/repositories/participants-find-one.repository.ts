import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ParticipantsFindOneFilterValidateContract } from '../contracts/participants-find-one-filter.validate-contract';
import { ParticipantsFindOneEntity } from '../entities/participants-find-one.entity';

export abstract class ParticipantsFindOneRepository {
    abstract execute(
        filter: ParticipantsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<ParticipantsFindOneEntity>;
}
