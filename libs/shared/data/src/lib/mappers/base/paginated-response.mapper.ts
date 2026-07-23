import { Paginate, PaginatedResponseDto } from '../../dtos/simple-response.dto';
import { unwrapResponse } from '../../utils/unwrap-response.util';

export abstract class PaginatedMapper<TEntity, TItemDto> {
    protected abstract mapItemFromDto(dto: TItemDto): TEntity;

    mapFromDto(dto: PaginatedResponseDto<TItemDto>): Paginate<TEntity> {
        const paginate = unwrapResponse(dto);
        return {
            ...paginate,
            data: (paginate.data ?? []).map((item) =>
                this.mapItemFromDto(item)
            ),
        };
    }
}
