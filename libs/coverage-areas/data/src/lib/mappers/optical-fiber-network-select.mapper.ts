import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { OpticalFiberNetworkSelectItemApiDto } from '../dtos/optical-fiber-network-select-response-api.dto';

@Service()
export class OpticalFiberNetworkSelectMapper extends ArrayResponseMapper<
    SelectOption,
    OpticalFiberNetworkSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: OpticalFiberNetworkSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.name, value: dto.id };
    }
}
