import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { PrivacyPolicySelectItemApiDto } from '../dtos/privacy-policy-select-response-api.dto';

@Service()
export class PrivacyPolicySelectMapper extends ArrayResponseMapper<
    SelectOption,
    PrivacyPolicySelectItemApiDto
> {
    protected mapItemFromDto(dto: PrivacyPolicySelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.version, value: dto.id };
    }
}
