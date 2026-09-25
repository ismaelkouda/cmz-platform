import { Service, computed, effect, inject, signal } from '@angular/core';
import {
    ResourceFacade,
    type ResourceStreamContext,
} from '@cmz/shared-application';
import { type Observable } from 'rxjs';

import { ListUserProfilesSource } from './list-user-profiles.source';
import type { ProfileOption } from './models';

interface LoadOptions {
    readonly forceRefresh?: boolean;
}

interface QueryParams {
    readonly forceRefresh: boolean;
}

export type ListUserProfilesState =
    'idle' | 'loading' | 'success' | 'empty' | 'error' | 'reloading';

@Service({ autoProvided: false })
export class ListUserProfilesFacade extends ResourceFacade<
    readonly ProfileOption[],
    QueryParams
> {
    private readonly source = inject(ListUserProfilesSource);
    private readonly lastResolvedItems = signal<readonly ProfileOption[]>([]);

    readonly items = computed(() => this.value() ?? this.lastResolvedItems());
    readonly state = computed<ListUserProfilesState>(() => {
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
                this.lastResolvedItems.set(value);
            }
        });
    }

    protected stream(
        params: QueryParams,
        context: ResourceStreamContext
    ): Observable<readonly ProfileOption[]> {
        const isRefresh =
            params.forceRefresh || context.previousStatus !== 'idle';
        return this.source.readAll(isRefresh);
    }

    load(options: LoadOptions = {}): void {
        this.setParams({ forceRefresh: options.forceRefresh ?? false });
    }
}
