import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MunicipalityFindOneEntity,
    MunicipalityFindOneFilterContract,
    MunicipalityFindOneRepository,
    municipalityFindOneFilterVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MunicipalityFindOneUseCase {
    private readonly repository = inject(MunicipalityFindOneRepository);

    execute(
        contract: MunicipalityFindOneFilterContract,
        options?: FetchOptions
    ): Observable<MunicipalityFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                municipalityFindOneFilterVo(contract),
                options
            )
        );
    }
}
