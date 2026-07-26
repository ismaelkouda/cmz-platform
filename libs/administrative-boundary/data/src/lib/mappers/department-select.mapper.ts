import { Service } from '@angular/core';
import { DepartmentOption } from '@cmz/administrative-boundary-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { DepartmentSelectItemApiDto } from '../dtos/department-select-response-api.dto';

@Service()
export class DepartmentSelectMapper extends ArrayResponseMapper<
    DepartmentOption,
    DepartmentSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: DepartmentSelectItemApiDto
    ): DepartmentOption {
        MapperUtils.validateDto(dto, {
            required: ['id', 'name', 'code', 'municipalities'],
        });
        return {
            id: dto.id,
            name: dto.name,
            code: dto.code,
            municipalities: dto.municipalities.map((municipality) => ({
                id: municipality.id,
                name: municipality.name,
                code: municipality.code,
            })),
        };
    }
}
