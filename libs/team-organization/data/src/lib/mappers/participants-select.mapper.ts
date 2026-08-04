import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { ParticipantsSelectItemApiDto } from '../dtos/participants-select-response-api.dto';

/**
 * `${last_name} ${first_name}` — même ordre que le seul autre précédent de
 * combinaison first_name/last_name du dépôt
 * (`tasks-actions-processing-item.mapper.ts`, `createdBy`/`updatedBy`).
 */
@Service()
export class ParticipantsSelectMapper extends ArrayResponseMapper<
    SelectOption,
    ParticipantsSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: ParticipantsSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return {
            label: `${dto.last_name} ${dto.first_name}`,
            value: dto.id,
        };
    }
}
