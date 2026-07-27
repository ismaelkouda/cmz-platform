import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    RadioRelayLinksFindOneEntity,
    RadioRelayLinksFindOneFilterContract,
    RadioRelayLinksFindOneRepository,
    radioRelayLinksFindOneFilterVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class RadioRelayLinksFindOneUseCase {
    private readonly repository = inject(RadioRelayLinksFindOneRepository);

    execute(
        contract: RadioRelayLinksFindOneFilterContract,
        options?: FetchOptions
    ): Observable<RadioRelayLinksFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                radioRelayLinksFindOneFilterVo(contract),
                options
            )
        );
    }
}
