import { SimpleResponseDto } from '../../dtos/simple-response.dto';
import { unwrapResponse } from '../../utils/unwrap-response.util';

export abstract class SimpleResponseMapper<TEntity, TItemDto> {
    protected abstract mapItemFromDto(dto: TItemDto): TEntity;

    mapFromDto(dto: SimpleResponseDto<TItemDto>): TEntity {
        return this.mapItemFromDto(unwrapResponse(dto));
    }
}
