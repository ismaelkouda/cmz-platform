import { Injectable } from '@angular/core';
import { ResourcesSelectItemApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-select-response-api.dto';
import { ArrayResponseMapper } from '@shared/data/mappers/base/array-response.mapper';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { MapperUtils } from '@shared/domain/utils/mapper-utils';

@Injectable({
    providedIn: 'root',
})
export class ResourcesSelectMapper extends ArrayResponseMapper<
    SelectOption,
    ResourcesSelectItemApiDto
> {
    protected mapItemFromDto(dto: ResourcesSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return {
            label: dto.name,
            value: dto.id,
        };
    }
}
