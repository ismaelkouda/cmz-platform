import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * Cascade department → municipality (racine `department`, pas de région
 * parente ici — cf. `RegionSelectRepository` pour le cascade complet
 * region → department → municipality).
 */
export interface DepartmentSelectItemApiDto {
    id: string;
    name: string;
    code: string;
    municipalities: MunicipalitySelectNestedApiDto[];
}

export interface MunicipalitySelectNestedApiDto {
    id: string;
    name: string;
    code: string;
}

export type DepartmentSelectResponseApiDto = SimpleResponseDto<
    DepartmentSelectItemApiDto[]
>;
