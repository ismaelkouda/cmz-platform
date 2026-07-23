import { Service } from '@angular/core';
import { ActorEntity } from '@cmz/shared-domain';
import { ActorDto } from '../dtos/actor.dto';

@Service()
export class ActorMapper {
    mapToEntity(dtoValue: ActorDto | null): ActorEntity | null {
        if (!dtoValue) {
            return null;
        }
        return new ActorEntity(
            dtoValue.id,
            dtoValue.first_name,
            dtoValue.last_name,
            dtoValue.phone,
            dtoValue.email
        );
    }

    mapToDto(entityValue: ActorEntity | null): ActorDto | null {
        if (!entityValue) {
            return null;
        }
        return {
            id: entityValue.id,
            first_name: entityValue.firstName,
            last_name: entityValue.lastName,
            phone: entityValue.phone,
            email: entityValue.email,
        };
    }
}
