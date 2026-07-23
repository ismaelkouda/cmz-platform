import { Service } from '@angular/core';
import { TimestampsEntity } from '@cmz/shared-domain';
import { TimestampsDto } from '../dtos/timestamps.dto';

@Service()
export class TimestampsMapper {
    mapToEntity(dtoValue: TimestampsDto): TimestampsEntity {
        return new TimestampsEntity(dtoValue.created_at, dtoValue.updated_at);
    }

    mapToDto(entityValue: TimestampsEntity): TimestampsDto {
        return {
            created_at: entityValue.createdAt,
            updated_at: entityValue.updatedAt,
        };
    }
}
