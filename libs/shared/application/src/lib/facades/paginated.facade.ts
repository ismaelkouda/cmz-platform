import { computed, signal } from '@angular/core';
import { PAGINATION_CONST } from '@cmz/shared-constants';
import { Paginate } from '@cmz/shared-data';
import { Observable } from 'rxjs';
import { BaseFacade } from './base.facade';

/**
 * Facade paginée : état signal-based de `Paginate<TEntity>` + signal de page.
 */
export abstract class PaginatedFacade<TEntity, TFilter> extends BaseFacade<
    Paginate<TEntity>,
    TFilter
> {
    protected readonly _page = signal<string>(PAGINATION_CONST.DEFAULT_PAGE);
    readonly page = this._page.asReadonly();
    readonly items = computed(() => this._state().data?.data ?? []);

    protected fetchPage(
        filter: TFilter | null,
        page: string,
        loader$: Observable<Paginate<TEntity>>
    ): void {
        this._page.set(page);
        this.fetch(filter, loader$);
    }
}
