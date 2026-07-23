import { computed, signal } from '@angular/core';
import { PAGINATION_CONST } from '@cmz/shared-constants';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { BaseFacade } from './base.facade';

/**
 * Facade paginée : état signal-based d'un `PageResult<TEntity>` (modèle domaine
 * neutre) + signal de page. L'application ne dépend d'aucune forme réseau.
 */
export abstract class PaginatedFacade<TEntity, TFilter> extends BaseFacade<
    PageResult<TEntity>,
    TFilter
> {
    protected readonly _page = signal<string>(PAGINATION_CONST.DEFAULT_PAGE);
    readonly page = this._page.asReadonly();
    readonly items = computed(() => this._state().data?.items ?? []);

    protected fetchPage(
        filter: TFilter | null,
        page: string,
        loader$: Observable<PageResult<TEntity>>
    ): void {
        this._page.set(page);
        this.fetch(filter, loader$);
    }
}
