import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TeamsFindOneFilterValidateContract } from '../contracts/teams-find-one-filter.validate-contract';
import { TeamsFindOneEntity } from '../entities/teams-find-one.entity';

export abstract class TeamsFindOneRepository {
    abstract execute(
        filter: TeamsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<TeamsFindOneEntity>;
}
