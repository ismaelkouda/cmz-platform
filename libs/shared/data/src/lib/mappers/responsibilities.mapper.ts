import { Service } from '@angular/core';
import { Responsibilities } from '@cmz/shared-domain';
import { ResponsibilitiesDto } from '../dtos/responsibilities.dto';

@Service()
export class ResponsibilitiesMapper {
    mapFromDto(dtoValue: ResponsibilitiesDto): Responsibilities {
        const methodMap: Record<ResponsibilitiesDto, Responsibilities> = {
            [ResponsibilitiesDto.SUPERVISOR]: Responsibilities.SUPERVISOR,
            [ResponsibilitiesDto.LEADER]: Responsibilities.LEADER,
            [ResponsibilitiesDto.AGENT]: Responsibilities.AGENT,
        };
        return methodMap[dtoValue] ?? Responsibilities.AGENT;
    }
}
