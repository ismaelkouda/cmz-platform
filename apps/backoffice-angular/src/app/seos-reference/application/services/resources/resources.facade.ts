import { inject, Injectable, signal } from '@angular/core';
import { ResourcesCreateCommand } from '@pages/seos-reference/application/commands/resources/resources-create.command';
import { ResourcesDeleteCommand } from '@pages/seos-reference/application/commands/resources/resources-delete.command';
import { ResourcesUpdateCommand } from '@pages/seos-reference/application/commands/resources/resources-update.command';
import { ResourcesCreateBus } from '@pages/seos-reference/application/commands-bus/resources/resources-create.bus';
import { ResourcesDeleteBus } from '@pages/seos-reference/application/commands-bus/resources/resources-delete.bus';
import { ResourcesUpdateBus } from '@pages/seos-reference/application/commands-bus/resources/resources-update.bus';
import { ResourcesCreateDto } from '@pages/seos-reference/application/dto/resources/resources-create.dto';
import { ResourcesDeleteDto } from '@pages/seos-reference/application/dto/resources/resources-delete.dto';
import { ResourcesFilterDto } from '@pages/seos-reference/application/dto/resources/resources-filter.dto';
import { ResourcesUpdateDto } from '@pages/seos-reference/application/dto/resources/resources-update.dto';
import { ResourcesQuery } from '@pages/seos-reference/application/queries/resources/resources.query';
import { ResourcesBus } from '@pages/seos-reference/application/queries-bus/resources/resources.bus';
import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import { BaseFacade } from '@shared/application/services/base-facade';
import { handleObservableWithFeedback } from '@shared/application/services/facade.utils';
import { PAGINATION_CONST } from '@shared/constants/pagination.constants';
import { UiFeedbackService } from '@shared/domain/services/ui-feedback.service';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ResourcesFacade extends BaseFacade<
    ResourcesEntity,
    ResourcesFilterDto
> {
    private readonly uiFeedback = inject(UiFeedbackService);
    private readonly filterBus = inject(ResourcesBus);
    private readonly createBus = inject(ResourcesCreateBus);
    private readonly updateBus = inject(ResourcesUpdateBus);
    private readonly deleteBus = inject(ResourcesDeleteBus);

    private readonly _actionState = signal<'idle' | 'loading'>('idle');
    readonly actionState = this._actionState.asReadonly();

    private readonly _actionSuccess = signal(0);
    readonly actionSuccess = this._actionSuccess.asReadonly();

    private readonly _actionError = signal<unknown | null>(null);
    readonly actionError = this._actionError.asReadonly();

    private hasInitialized = false;
    private lastFetchTimestamp = 0;

    readAll(
        filter: ResourcesFilterDto,
        page: string = PAGINATION_CONST.DEFAULT_PAGE,
        options: FetchOptions = {}
    ): void {
        this.executeQuery(filter, page, options);
        this.hasInitialized = true;
    }

    refresh(): void {
        this.filterSubject.next(null);
        this.pageSubject.next(PAGINATION_CONST.DEFAULT_PAGE);
        this.executeQuery(null, this.pageSubject.getValue(), {
            forceRefresh: true,
        });
    }

    changePage(page: string): void {
        const filter = this.filterSubject.getValue();
        if (!filter) {
            return;
        }
        this.executeQuery(filter, page);
    }

    refreshWithLastFilterAndPage(): void {
        this.executeQuery(
            this.filterSubject.getValue(),
            this.pageSubject.getValue(),
            {
                forceRefresh: true,
            }
        );
    }

    private executeQuery(
        filter: ResourcesFilterDto | null,
        page: string,
        options: FetchOptions = {}
    ): void {
        const query = this.buildQuery(filter);
        const fetch$ = this.filterBus.dispatch(query, page, options);
        this.fetchWithFilterAndPage(filter, page, fetch$, this.uiFeedback);
        this.lastFetchTimestamp = Date.now();
    }

    private buildQuery(filter?: ResourcesFilterDto | null): ResourcesQuery {
        return new ResourcesQuery(
            filter?.search,
            filter?.startDate,
            filter?.endDate
        );
    }

    resetMemory(): void {
        this.hasInitialized = false;
        this.lastFetchTimestamp = 0;
        this.reset();
    }

    getMemoryStatus(): {
        hasInitialized: boolean;
        lastFetch: number;
        hasData: boolean;
    } {
        return {
            hasInitialized: this.hasInitialized,
            lastFetch: this.lastFetchTimestamp,
            hasData: this.itemsSubject.getValue() !== null,
        };
    }

    create(dto: ResourcesCreateDto): void {
        this._actionState.set('loading');
        const command = new ResourcesCreateCommand(
            dto?.code,
            dto?.name,
            dto?.description
        );
        this.handleActionWithRefresh(
            this.createBus.dispatch(command),
            'COMMON.SUCCESS.CREATE'
        )
            .pipe(
                tap(() => {
                    this._actionSuccess.update((v) => v + 1);
                }),
                catchError((err) => {
                    this._actionError.set(err);
                    return throwError(() => err);
                }),
                finalize(() => this._actionState.set('idle'))
            )
            .subscribe();
    }

    update(dto: ResourcesUpdateDto): void {
        this._actionState.set('loading');
        const command = new ResourcesUpdateCommand(
            dto?.uniqId,
            dto?.code,
            dto?.name,
            dto?.description
        );
        this.handleActionWithRefresh(
            this.updateBus.dispatch(command),
            'COMMON.SUCCESS.UPDATE'
        )
            .pipe(
                tap(() => {
                    this._actionSuccess.update((v) => v + 1);
                }),
                catchError((err) => {
                    this._actionError.set(err);
                    return throwError(() => err);
                }),
                finalize(() => this._actionState.set('idle'))
            )
            .subscribe();
    }

    delete(dto: ResourcesDeleteDto): void {
        const command = new ResourcesDeleteCommand(dto.uniqId);
        this.handleActionWithRefresh(
            this.deleteBus.dispatch(command),
            'COMMON.SUCCESS.DELETE'
        ).subscribe();
    }

    private handleActionWithRefresh<T>(
        observable: Observable<T>,
        successKey: string
    ): Observable<T> {
        return handleObservableWithFeedback(
            observable,
            this.uiFeedback,
            successKey,
            () => this.refresh()
        );
    }
}
