import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { RadioRelayLinksFindOneFilterValidateContract } from '../contracts/radio-relay-links-find-one-filter.validate-contract';
import { RadioRelayLinksFindOneEntity } from '../entities/radio-relay-links-find-one.entity';

export abstract class RadioRelayLinksFindOneRepository {
    abstract execute(
        filter: RadioRelayLinksFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<RadioRelayLinksFindOneEntity>;
}
