import { computed, inject, signal } from '@angular/core';
import { DomainError } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ResourceState } from '../interfaces/resource-state.interface';
import { ErrorHandlerRegistry } from '../services/error-handler-registry.service';
import { shouldFetch } from './facade.util';

/**
 * Facade de base **signal-based** (reco Angular : état en signaux). Couvre les
 * cas « objet » (TData = entité) et « liste » (TData = entité[]). Les erreurs
 * sont dispatchées via `ErrorHandlerRegistry` (application), pas via l'UI.
 */
export abstract class BaseFacade<TData, TFilter> {
    private readonly errorHandler = inject(ErrorHandlerRegistry);

    protected readonly _state = signal<ResourceState<TData, TFilter>>({
        filter: null,
        data: null,
        loading: false,
        error: null,
        lastFetch: 0,
    });

    readonly state = this._state.asReadonly();
    readonly filter = computed(() => this._state().filter);
    readonly data = computed(() => this._state().data);
    readonly loading = computed(() => this._state().loading);
    readonly error = computed(() => this._state().error);

    protected fetch(filter: TFilter | null, loader$: Observable<TData>): void {
        if (this._state().loading) {
            return;
        }
        this._state.update((s) => ({
            ...s,
            filter,
            loading: true,
            error: null,
        }));

        loader$.subscribe({
            next: (data) =>
                this._state.set({
                    filter,
                    data,
                    loading: false,
                    error: null,
                    lastFetch: Date.now(),
                }),
            error: (err: unknown) => {
                this._state.update((s) => ({
                    ...s,
                    loading: false,
                    error: err,
                }));
                this.errorHandler.handle(err as DomainError);
            },
        });
    }

    protected shouldRefetch(forceRefresh: boolean, staleTime: number): boolean {
        return shouldFetch(
            forceRefresh,
            this._state().data !== null,
            this._state().lastFetch,
            staleTime
        );
    }

    reset(): void {
        this._state.set({
            filter: null,
            data: null,
            loading: false,
            error: null,
            lastFetch: 0,
        });
    }
}
