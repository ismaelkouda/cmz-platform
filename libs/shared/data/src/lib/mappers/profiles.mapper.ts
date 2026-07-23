import { Service } from '@angular/core';
import { Profiles } from '@cmz/shared-domain';
import { ProfilesDto } from '../dtos/profiles.dto';

@Service()
export class ProfilesMapper {
    mapFromDto(dtoValue: ProfilesDto): Profiles {
        const methodMap: Record<ProfilesDto, Profiles> = {
            [ProfilesDto.SUPERVISOR]: Profiles.SUPERVISOR,
            [ProfilesDto.LEADER]: Profiles.LEADER,
            [ProfilesDto.AGENT]: Profiles.AGENT,
        };
        return methodMap[dtoValue] ?? Profiles.AGENT;
    }
}
