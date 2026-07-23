import { Service } from '@angular/core';
import { ActionDropdown } from '@cmz/shared-domain';
import { ActionDropdownDto } from '../dtos/action-dropdown.dto';

@Service()
export class ActionDropdownMapper {
    mapFromDto(dtoValue: ActionDropdownDto): ActionDropdown {
        const methodMap: Record<ActionDropdownDto, ActionDropdown> = {
            [ActionDropdownDto.ACTIVE]: ActionDropdown.ACTIVE,
            [ActionDropdownDto.INACTIVE]: ActionDropdown.INACTIVE,
            [ActionDropdownDto.PUBLISH]: ActionDropdown.PUBLISH,
            [ActionDropdownDto.UNPUBLISH]: ActionDropdown.UNPUBLISH,
        };
        return methodMap[dtoValue] ?? ActionDropdown.INACTIVE;
    }
}
