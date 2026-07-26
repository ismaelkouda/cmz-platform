import { SimpleResponseDto } from '@cmz/shared-data';
import { MunicipalitySelectNestedApiDto } from './department-select-response-api.dto';

/**
 * Cascade region → department → municipality en une seule réponse (évite un
 * rappel réseau par niveau côté formulaire, cf. décision « cascade select »).
 * `MunicipalitySelectNestedApiDto` réutilisé depuis `department-select-response-api.dto`
 * (même feuille de cascade, pas de duplication de shape).
 */
export interface RegionSelectItemApiDto {
    id: string;
    name: string;
    code: string;
    departments: DepartmentSelectNestedApiDto[];
}

export interface DepartmentSelectNestedApiDto {
    id: string;
    name: string;
    code: string;
    municipalities: MunicipalitySelectNestedApiDto[];
}

export type RegionSelectResponseApiDto = SimpleResponseDto<
    RegionSelectItemApiDto[]
>;
