import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`name`/`code` — mêmes champs que `MunicipalitySelectNestedApiDto`
 * (`department-select-response-api.dto.ts`), même feuille de cascade,
 * pas de duplication de shape.
 */
export interface MunicipalitySelectItemApiDto {
    id: string;
    name: string;
    code: string;
}

export type MunicipalitySelectResponseApiDto = SimpleResponseDto<
    MunicipalitySelectItemApiDto[]
>;
