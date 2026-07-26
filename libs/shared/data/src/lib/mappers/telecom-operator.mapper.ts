import { Service } from '@angular/core';
import { isTelecomOperator, TelecomOperator } from '@cmz/shared-domain';
import { TelecomOperatorDto } from '../dtos/telecom-operator.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class TelecomOperatorMapper {
    mapFromDto(dto: TelecomOperatorDto): TelecomOperator {
        if (!isTelecomOperator(dto)) {
            throw ApiError.invalidResponse(
                `TelecomOperator wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: TelecomOperator): TelecomOperatorDto {
        return value as TelecomOperatorDto;
    }

    parse(raw: string): TelecomOperator {
        if (!isTelecomOperator(raw)) {
            throw ApiError.invalidResponse(
                `TelecomOperator wire inconnue: ${raw}`
            );
        }
        return raw;
    }
}
