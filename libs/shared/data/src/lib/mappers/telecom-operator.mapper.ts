import { Service } from '@angular/core';
import { TelecomOperator } from '@cmz/shared-domain';
import { TelecomOperatorDto } from '../dtos/telecom-operator.dto';

@Service()
export class TelecomOperatorMapper {
    private static readonly MAP = new Map<TelecomOperatorDto, TelecomOperator>([
        [TelecomOperatorDto.MTN, TelecomOperator.MTN],
        [TelecomOperatorDto.ORANGE, TelecomOperator.ORANGE],
        [TelecomOperatorDto.MOOV, TelecomOperator.MOOV],
    ]);

    mapFromDto(dto: TelecomOperatorDto): TelecomOperator {
        return TelecomOperatorMapper.MAP.get(dto) ?? TelecomOperator.ORANGE;
    }
}
