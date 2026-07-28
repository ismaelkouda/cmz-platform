import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { ProfilesPermissionsSelectItemApiDto } from '../dtos/profiles-permissions-select-response-api.dto';

@Service()
export class ProfilesPermissionsSelectMapper extends ArrayResponseMapper<
    SelectOption,
    ProfilesPermissionsSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: ProfilesPermissionsSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        return { label: dto.name, value: dto.uniq_id };
    }
}
