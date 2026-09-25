import { Service, computed, effect, inject, signal } from '@angular/core';
import {
    ResourceFacade,
    type ResourceStreamContext,
} from '@cmz/shared-application';
import { type Observable } from 'rxjs';

import { ListUsersSource } from './list-users.source';
import type { ListUsersInput, ListUsersPage } from './models';

interface LoadOptions {
    readonly forceRefresh?: boolean;
}

interface QueryParams {
    readonly forceRefresh: boolean;

    readonly input: ListUsersInput;
}

export type ListUsersState =
    'idle' | 'loading' | 'success' | 'empty' | 'error' | 'reloading';

@Service({ autoProvided: false })
export class ListUsersFacade extends ResourceFacade<
    ListUsersPage,
    QueryParams
> {
    private readonly source = inject(ListUsersSource);
    private readonly lastResolvedPage = signal<ListUsersPage | undefined>(
        undefined
    );

    readonly page = computed(() => this.value() ?? this.lastResolvedPage());
    readonly items = computed(() => this.page()?.items ?? []);
    readonly state = computed<ListUsersState>(() => {
        const status = this.status();
        if (status === 'resolved' || status === 'local') {
            return this.items().length === 0 ? 'empty' : 'success';
        }
        return status;
    });

    constructor() {
        super();
        effect(() => {
            const status = this.status();
            const value = this.value();
            if ((status === 'resolved' || status === 'local') && value) {
                this.lastResolvedPage.set(value);
            }
        });
    }

    protected stream(
        params: QueryParams,
        context: ResourceStreamContext
    ): Observable<ListUsersPage> {
        const isRefresh =
            params.forceRefresh || context.previousStatus !== 'idle';
        return this.source.readAll(params.input, isRefresh);
    }

    load(input: ListUsersInput, options: LoadOptions = {}): void {
        this.setParams({ input, forceRefresh: options.forceRefresh ?? false });
    }
}
