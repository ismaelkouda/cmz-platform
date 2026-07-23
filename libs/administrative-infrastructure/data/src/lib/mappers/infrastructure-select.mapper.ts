import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { InfrastructureSelectItemApiDto } from '../dtos/infrastructure-select-response-api.dto';

@Service()
export class InfrastructureSelectMapper extends ArrayResponseMapper<
    SelectOption,
    InfrastructureSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: InfrastructureSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.name, value: dto.id };
    }
}
