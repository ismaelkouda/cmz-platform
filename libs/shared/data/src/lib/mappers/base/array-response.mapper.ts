import { ApiError } from '../../errors/api.error';

interface ArrayResponseDto<TItemDto> {
    error: boolean;
    message: string;
    data: TItemDto[];
}

export abstract class ArrayResponseMapper<TEntity, TItemDto> {
    protected abstract mapItemFromDto(dto: TItemDto): TEntity;

    mapFromDto(dto: ArrayResponseDto<TItemDto>): TEntity[] {
        this.validateResponse(dto);
        return dto.data.map((item) => this.mapItemFromDto(item));
    }

    private validateResponse(dto: ArrayResponseDto<TItemDto>): void {
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
