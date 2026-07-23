import { Paginate, PaginatedResponseDto } from '../../dtos/simple-response.dto';
import { ApiError } from '../../errors/api.error';

export abstract class PaginatedMapper<TEntity, TItemDto> {
    protected abstract mapItemFromDto(dto: TItemDto): TEntity;

    mapFromDto(dto: PaginatedResponseDto<TItemDto>): Paginate<TEntity> {
        this.validateResponse(dto);
        const items = dto.data.data ?? [];
        const mappedItems = items.map((item) => this.mapItemFromDto(item));
        return { ...dto.data, data: mappedItems };
    }

    private validateResponse(dto: PaginatedResponseDto<TItemDto>): void {
        if (dto.error) {
            throw ApiError.invalidResponse(
                dto.message || 'Erreur API: la requête a échoué.'
            );
        }
        if (!dto.data) {
            throw ApiError.invalidResponse(
                'Erreur API: aucune donnée reçue dans la réponse.'
            );
        }
    }
}
