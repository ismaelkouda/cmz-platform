import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { InfrastructureTypeSelectItemApiDto } from '../dtos/infrastructure-type-select-response-api.dto';

@Service()
export class InfrastructureTypeSelectMapper extends ArrayResponseMapper<
    SelectOption,
    InfrastructureTypeSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: InfrastructureTypeSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.name, value: dto.id };
    }
}
