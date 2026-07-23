import { PageResult } from '@cmz/shared-domain';
import { PaginatedResponseDto } from '../../dtos/simple-response.dto';
import { unwrapResponse } from '../../utils/unwrap-response.util';

/**
 * Base des mappers paginés : traduit l'enveloppe de pagination du transport
 * (`Paginate`, forme réseau) vers le modèle domaine neutre `PageResult<TEntity>`.
 * Le bruit transport (URLs, `links`, `path`, `from`/`to`) n'est pas propagé au domaine.
 */
export abstract class PaginatedMapper<TEntity, TItemDto> {
    protected abstract mapItemFromDto(dto: TItemDto): TEntity;

    mapFromDto(dto: PaginatedResponseDto<TItemDto>): PageResult<TEntity> {
        const paginate = unwrapResponse(dto);
        return {
            items: (paginate.data ?? []).map((item) =>
                this.mapItemFromDto(item)
            ),
            currentPage: paginate.current_page,
            lastPage: paginate.last_page,
            perPage: paginate.per_page,
            total: paginate.total,
        };
    }
}
