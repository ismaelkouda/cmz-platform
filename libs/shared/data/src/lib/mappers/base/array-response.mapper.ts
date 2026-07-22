import { ApiError } from '@cmz/shared-domain';

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
                dto.message || 'Erreur API: La requête a échoué.'
            );
        }
        if (!dto.data) {
            throw ApiError.invalidResponse(
                'Erreur API: Aucune donnée reçue dans la réponse.'
            );
        }
    }
}
