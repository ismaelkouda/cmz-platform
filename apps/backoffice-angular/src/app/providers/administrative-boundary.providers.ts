import { Provider } from '@angular/core';
import {
    DepartmentFindOneRepository,
    DepartmentRepository,
    DepartmentSelectRepository,
    DepartmentsByRegionIdRepository,
    MunicipalitiesByDepartmentIdRepository,
    MunicipalityFindOneRepository,
    MunicipalityRepository,
    RegionFindOneRepository,
    RegionRepository,
    RegionSelectRepository,
} from '@cmz/administrative-boundary-domain';
import {
    DepartmentFindOneRepositoryImpl,
    DepartmentRepositoryImpl,
    DepartmentSelectRepositoryImpl,
    DepartmentsByRegionIdRepositoryImpl,
    MunicipalitiesByDepartmentIdRepositoryImpl,
    MunicipalityFindOneRepositoryImpl,
    MunicipalityRepositoryImpl,
    RegionFindOneRepositoryImpl,
    RegionRepositoryImpl,
    RegionSelectRepositoryImpl,
} from '@cmz/administrative-boundary-data';

/**
 * Composition root du module `administrative-boundary` : wire les ports
 * domaine à leurs implémentations `data`. À fournir au niveau app
 * (`app.config`) — les façades/use-cases sont des singletons root.
 * Pas de port select pour `municipality` (confirmé mort en Phase 2).
 */
export function provideAdministrativeBoundary(): Provider[] {
    return [
        { provide: RegionRepository, useClass: RegionRepositoryImpl },
        {
            provide: RegionFindOneRepository,
            useClass: RegionFindOneRepositoryImpl,
        },
        {
            provide: RegionSelectRepository,
            useClass: RegionSelectRepositoryImpl,
        },
        { provide: DepartmentRepository, useClass: DepartmentRepositoryImpl },
        {
            provide: DepartmentFindOneRepository,
            useClass: DepartmentFindOneRepositoryImpl,
        },
        {
            provide: DepartmentSelectRepository,
            useClass: DepartmentSelectRepositoryImpl,
        },
        {
            provide: DepartmentsByRegionIdRepository,
            useClass: DepartmentsByRegionIdRepositoryImpl,
        },
        {
            provide: MunicipalityRepository,
            useClass: MunicipalityRepositoryImpl,
        },
        {
            provide: MunicipalityFindOneRepository,
            useClass: MunicipalityFindOneRepositoryImpl,
        },
        {
            provide: MunicipalitiesByDepartmentIdRepository,
            useClass: MunicipalitiesByDepartmentIdRepositoryImpl,
        },
    ];
}
