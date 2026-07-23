import { SimpleResponseDto } from '../../dtos/simple-response.dto';
import { ApiError } from '../../errors/api.error';

export abstract class SimpleResponseMapper<TEntity, TItemDto> {
    protected abstract mapItemFromDto(dto: TItemDto): TEntity;

    mapFromDto(dto: SimpleResponseDto<TItemDto>): TEntity {
        this.validateResponse(dto);
        return this.mapItemFromDto(dto.data);
    }

    private validateResponse(dto: SimpleResponseDto<TItemDto>): void {
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
