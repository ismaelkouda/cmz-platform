import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { MobileNetworkSelectItemApiDto } from '../dtos/mobile-network-select-response-api.dto';

@Service()
export class MobileNetworkSelectMapper extends ArrayResponseMapper<
    SelectOption,
    MobileNetworkSelectItemApiDto
> {
    protected mapItemFromDto(dto: MobileNetworkSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.site_name, value: dto.id };
    }
}
