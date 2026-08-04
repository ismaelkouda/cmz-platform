import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { UsersSelectItemApiDto } from '../dtos/users-select-response-api.dto';

/**
 * `${last_name} ${first_name}` — même convention que
 * `participants-select.mapper.ts` (team-organization) et
 * l'unique autre précédent du dépôt (`tasks-actions-processing-item.mapper.ts`).
 */
@Service()
export class UsersSelectMapper extends ArrayResponseMapper<
    SelectOption,
    UsersSelectItemApiDto
> {
    protected mapItemFromDto(dto: UsersSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return {
            label: `${dto.last_name} ${dto.first_name}`,
            value: dto.id,
        };
    }
}
