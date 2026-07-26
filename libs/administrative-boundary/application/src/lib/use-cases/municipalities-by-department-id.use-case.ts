import { Service, inject } from '@angular/core';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    MunicipalitiesByDepartmentIdEntity,
    MunicipalitiesByDepartmentIdFilterContract,
    MunicipalitiesByDepartmentIdRepository,
    municipalitiesByDepartmentIdFilterEntity,
    municipalitiesByDepartmentIdFilterVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

/** Vue imbriquée « communes d'un département » — lecture seule. */
@Service()
export class MunicipalitiesByDepartmentIdUseCase {
    private readonly repository = inject(
        MunicipalitiesByDepartmentIdRepository
    );

    execute(
        contract: MunicipalitiesByDepartmentIdFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MunicipalitiesByDepartmentIdEntity>> {
        return defer(() =>
            this.repository.execute(
                municipalitiesByDepartmentIdFilterEntity(
                    municipalitiesByDepartmentIdFilterVo(contract)
                ),
                page,
                options
            )
        );
    }
}
