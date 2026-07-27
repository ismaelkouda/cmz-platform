import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { TowerTypeSelectItemApiDto } from '../dtos/tower-type-select-response-api.dto';

@Service()
export class TowerTypeSelectMapper extends ArrayResponseMapper<
    SelectOption,
    TowerTypeSelectItemApiDto
> {
    protected mapItemFromDto(dto: TowerTypeSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.name, value: dto.id };
    }
}
