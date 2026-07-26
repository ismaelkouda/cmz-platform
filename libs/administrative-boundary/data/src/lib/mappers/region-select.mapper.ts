import { Service } from '@angular/core';
import { RegionOption } from '@cmz/administrative-boundary-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { RegionSelectItemApiDto } from '../dtos/region-select-response-api.dto';

/**
 * Mappe le cascade complet region → department → municipality en une passe.
 * Valeurs pures (`RegionOption`/`DepartmentOption`/`MunicipalityOption` — pas
 * de classe, pas d'identité `.with()` à préserver) : pas de cache d'entité ici,
 * contrairement aux mappers d'entités paginées/uniques.
 */
@Service()
export class RegionSelectMapper extends ArrayResponseMapper<
    RegionOption,
    RegionSelectItemApiDto
> {
    protected mapItemFromDto(dto: RegionSelectItemApiDto): RegionOption {
        MapperUtils.validateDto(dto, {
            required: ['id', 'name', 'code', 'departments'],
        });
        return {
            id: dto.id,
            name: dto.name,
            code: dto.code,
            departments: dto.departments.map((department) => ({
                id: department.id,
                name: department.name,
                code: department.code,
                municipalities: department.municipalities.map(
                    (municipality) => ({
                        id: municipality.id,
                        name: municipality.name,
                        code: municipality.code,
                    })
                ),
            })),
        };
    }
}
