import { computed } from '@angular/core';
import { PAGINATION_CONST } from '@cmz/shared-constants';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { ResourceFacade } from './resource.facade';

/** Paramètres d'une requête paginée (filtre + page + options). */
export interface PageQuery<TFilter> {
    filter: TFilter | null;
    page: string;
    options?: FetchOptions;
}

/**
 * Façade paginée signal-first : liste via `rxResource` (héritée de
 * [[ResourceFacade]]). Expose `items` et `page` dérivés du `PageResult`.
 */
export abstract class PaginatedResourceFacade<
    TEntity,
    TFilter,
> extends ResourceFacade<PageResult<TEntity>, PageQuery<TFilter>> {
    readonly items = computed(() => this.value()?.items ?? []);
    readonly page = computed(
        () => this.value()?.currentPage ?? Number(PAGINATION_CONST.DEFAULT_PAGE)
    );
    readonly total = computed(() => this.value()?.total ?? 0);

    load(
        filter: TFilter | null,
        page: string = PAGINATION_CONST.DEFAULT_PAGE,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, page, options });
    }

    changePage(page: string): void {
        const current = this._params();
        this.setParams(current ? { ...current, page } : { filter: null, page });
    }
}
