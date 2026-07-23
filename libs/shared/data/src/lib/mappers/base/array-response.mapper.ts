import { unwrapResponse } from '../../utils/unwrap-response.util';

interface ArrayResponseDto<TItemDto> {
    error: boolean;
    message: string;
    data: TItemDto[];
}

export abstract class ArrayResponseMapper<TEntity, TItemDto> {
    protected abstract mapItemFromDto(dto: TItemDto): TEntity;

    mapFromDto(dto: ArrayResponseDto<TItemDto>): TEntity[] {
        return unwrapResponse(dto).map((item) => this.mapItemFromDto(item));
    }
}
