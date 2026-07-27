import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { FiberConstructorSelectItemApiDto } from '../dtos/fiber-constructor-select-response-api.dto';

@Service()
export class FiberConstructorSelectMapper extends ArrayResponseMapper<
    SelectOption,
    FiberConstructorSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: FiberConstructorSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.name, value: dto.id };
    }
}
