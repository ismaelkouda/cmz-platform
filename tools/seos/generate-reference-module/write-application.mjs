/**
 * SEOS generate-reference-module — writeApplication
 * Extrait mécanique du monolithe (plafond 800 l. CI).
 * Corps non-indenté volontairement : préserve les littéraux de templates.
 */

export function writeApplication(ctx) {
    const {
        w,
        E,
        Cap,
        MODULE,
        MODULE_UPPER,
        ENTITY_UPPER,
        ModuleCap,
        FIELD_DEFS,
        FIELD_NAMES,
        REQUIRED_FIELDS,
        EXTRA_FILTERS,
        API_BASE,
        BASE,
        crudOps,
        toSnake,
        pascalCase,
        upperSnake,
    } = ctx;

    // ---------------------------------------------------------------------
    // APPLICATION — commands / commands-mappers / commands-bus / commands-handlers
    // ---------------------------------------------------------------------

    for (const { kind, fields } of [
        ...crudOps,
        { kind: 'delete', fields: ['uniqId'] },
    ]) {
        const Kind = kind[0].toUpperCase() + kind.slice(1);
        w(
            `application/commands/${E}/${E}-${kind}.command.ts`,
            `
export class ${Cap}${Kind}Command {
    constructor(
        ${fields
            .map((f) => `public readonly ${f}: string | undefined`)
            .join(',\n        ')}
    ) {}
}
`
        );

        w(
            `application/commands-mappers/${E}/${E}-${kind}.mapper.ts`,
            `
import { ${Cap}${Kind}Command } from '${BASE}/application/commands/${E}/${E}-${kind}.command';
import { ${Cap}${Kind}Contract } from '${BASE}/domain/contracts/${E}/${E}-${kind}.contract';

export function ${E}${Kind}CommandMapper(command: ${Cap}${Kind}Command): ${Cap}${Kind}Contract {
    return {
        ${fields.map((f) => `${f}: command.${f}`).join(',\n        ')}
    };
}
`
        );

        w(
            `application/commands-bus/${E}/${E}-${kind}.bus.ts`,
            `
import { Injectable, inject } from '@angular/core';
import { ${Cap}${Kind}Command } from '${BASE}/application/commands/${E}/${E}-${kind}.command';
import { ${Cap}${Kind}Handler } from '${BASE}/application/commands-handlers/${E}/${E}-${kind}.handler';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}${Kind}Bus {
    private readonly ${kind}Handler = inject(${Cap}${Kind}Handler);

    dispatch<T>(command: T): Observable<MessageResponseDto> {
        if (command instanceof ${Cap}${Kind}Command) {
            return this.${kind}Handler.execute(command);
        }
        throw new Error('No handler found for command');
    }
}
`
        );

        w(
            `application/commands-handlers/${E}/${E}-${kind}.handler.ts`,
            `
import { inject, Injectable } from '@angular/core';
import { ${E}${Kind}CommandMapper } from '${BASE}/application/commands-mappers/${E}/${E}-${kind}.mapper';
import { ${Cap}${Kind}Command } from '${BASE}/application/commands/${E}/${E}-${kind}.command';
import { ${Cap}UseCase } from '${BASE}/application/use-cases/${E}/${E}.use-case';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}${Kind}Handler {
    private readonly useCase = inject(${Cap}UseCase);

    execute(command: ${Cap}${Kind}Command): Observable<MessageResponseDto> {
        return this.useCase.${kind}(${E}${Kind}CommandMapper(command));
    }
}
`
        );
    }

    // ---------------------------------------------------------------------
    // APPLICATION — queries / queries-mappers / queries-bus / queries-handlers
    // ---------------------------------------------------------------------

    w(
        `application/queries/${E}/${E}.query.ts`,
        `
export class ${Cap}Query {
    constructor(
        public readonly search?: string,
        public readonly startDate?: Date,
        public readonly endDate?: Date
    ) {}
}
`
    );
    w(
        `application/queries/${E}/${E}-find-one.query.ts`,
        `
export class ${Cap}FindOneQuery {
    constructor(public readonly uniqId?: string) {}
}
`
    );

    w(
        `application/queries-bus/${E}/${E}.bus.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}Query } from '${BASE}/application/queries/${E}/${E}.query';
import { ${Cap}Handler } from '${BASE}/application/queries-handlers/${E}/${E}.handler';
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import { Paginate } from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}Bus {
    private readonly handler = inject(${Cap}Handler);

    dispatch<T>(
        query: T,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<${Cap}Entity>> {
        if (query instanceof ${Cap}Query) {
            return this.handler.execute(query, page, options);
        }
        throw new Error('No handler found for query');
    }
}
`
    );

    w(
        `application/queries-bus/${E}/${E}-find-one.bus.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}FindOneQuery } from '${BASE}/application/queries/${E}/${E}-find-one.query';
import { ${Cap}FindOneHandler } from '${BASE}/application/queries-handlers/${E}/${E}-find-one.handler';
import { ${Cap}FindOneEntity } from '${BASE}/domain/entities/${E}/${E}-find-one.entity';
import { Observable } from 'rxjs';
import { FetchOptions } from '@shared/interface/fetch-options.interface';

@Injectable({ providedIn: 'root' })
export class ${Cap}FindOneBus {
    private readonly filterHandler = inject(${Cap}FindOneHandler);

    dispatch<T>(
        query: T,
        options?: FetchOptions
    ): Observable<${Cap}FindOneEntity> {
        if (query instanceof ${Cap}FindOneQuery) {
            return this.filterHandler.execute(query, options);
        }

        throw new Error('No handler found for query');
    }
}
`
    );

    w(
        `application/queries-mappers/${E}/${E}.mapper.ts`,
        `
import { ${Cap}Query } from '${BASE}/application/queries/${E}/${E}.query';
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';

export function ${E}QueryMapper(query: ${Cap}Query): ${Cap}FilterContract {
    return {
        search: query.search,
        startDate: query.startDate,
        endDate: query.endDate,
    };
}
`
    );

    w(
        `application/queries-mappers/${E}/${E}-find-one.mapper.ts`,
        `
import { ${Cap}FindOneQuery } from '${BASE}/application/queries/${E}/${E}-find-one.query';
import { ${Cap}FindOneFilterContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.contract';

export function ${E}FindOneQueryMapper(query: ${Cap}FindOneQuery): ${Cap}FindOneFilterContract {
    return { uniqId: query.uniqId };
}
`
    );

    w(
        `application/queries-handlers/${E}/${E}.handler.ts`,
        `
import { inject, Injectable } from '@angular/core';
import { ${E}QueryMapper } from '${BASE}/application/queries-mappers/${E}/${E}.mapper';
import { ${Cap}Query } from '${BASE}/application/queries/${E}/${E}.query';
import { ${Cap}UseCase } from '${BASE}/application/use-cases/${E}/${E}.use-case';
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import { Paginate } from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}Handler {
    private readonly useCase = inject(${Cap}UseCase);

    execute(
        query: ${Cap}Query,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<${Cap}Entity>> {
        return this.useCase.execute(${E}QueryMapper(query), page, options);
    }
}
`
    );

    w(
        `application/queries-handlers/${E}/${E}-find-one.handler.ts`,
        `
import { inject, Injectable } from '@angular/core';
import { ${E}FindOneQueryMapper } from '${BASE}/application/queries-mappers/${E}/${E}-find-one.mapper';
import { ${Cap}FindOneQuery } from '${BASE}/application/queries/${E}/${E}-find-one.query';
import { ${Cap}FindOneUseCase } from '${BASE}/application/use-cases/${E}/${E}-find-one.use-case';
import { ${Cap}FindOneEntity } from '${BASE}/domain/entities/${E}/${E}-find-one.entity';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}FindOneHandler {
    private readonly useCase = inject(${Cap}FindOneUseCase);

    execute(
        command: ${Cap}FindOneQuery,
        options?: FetchOptions
    ): Observable<${Cap}FindOneEntity> {
        return this.useCase.execute(
            ${E}FindOneQueryMapper(command),
            options
        );
    }
}
`
    );

    // ---------------------------------------------------------------------
    // APPLICATION — use-cases (main / find-one / select)
    // ---------------------------------------------------------------------

    // defer() sur TOUTE methode dont le VO/validateur appele peut lever une exception
    // synchrone : create, update, delete, execute (filtre, chaine VO -> Entity), find-one.
    // Corrige par rapport a l'ancienne version de ce generateur, qui ne deferait que
    // create/update alors qu'execute()/delete() valident aussi et peuvent throw (meme classe
    // de bug qu'Experience 008/012/027/028/029, jamais corrigee dans le generateur lui-meme
    // jusqu'a cette reecriture).
    w(
        `application/use-cases/${E}/${E}.use-case.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}CreateContract } from '${BASE}/domain/contracts/${E}/${E}-create.contract';
import { ${Cap}DeleteContract } from '${BASE}/domain/contracts/${E}/${E}-delete.contract';
import { ${Cap}UpdateContract } from '${BASE}/domain/contracts/${E}/${E}-update.contract';
import { ${E}FilterEntity } from '${BASE}/domain/entities/${E}/${E}-filter.entity';
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';
import { ${Cap}Repository } from '${BASE}/domain/repositories/${E}/${E}.repository';
import { ${E}CreateVo } from '${BASE}/domain/value-objects/${E}/${E}-create.vo';
import { ${E}DeleteVo } from '${BASE}/domain/value-objects/${E}/${E}-delete.vo';
import { ${E}FilterVo } from '${BASE}/domain/value-objects/${E}/${E}-filter.vo';
import { ${E}UpdateVo } from '${BASE}/domain/value-objects/${E}/${E}-update.vo';
import {
    MessageResponseDto,
    Paginate,
} from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, defer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}UseCase {
    private readonly repository = inject(${Cap}Repository);

    execute(
        contract: ${Cap}FilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<${Cap}Entity>> {
        return defer(() => {
            const vo = ${E}FilterVo(contract);
            const entity = ${E}FilterEntity(vo);
            return this.repository.execute(entity, page, options);
        });
    }

    create(
        contract: ${Cap}CreateContract
    ): Observable<MessageResponseDto> {
        return defer(() => this.repository.create(${E}CreateVo(contract)));
    }

    update(
        contract: ${Cap}UpdateContract
    ): Observable<MessageResponseDto> {
        return defer(() => this.repository.update(${E}UpdateVo(contract)));
    }

    delete(
        contract: ${Cap}DeleteContract
    ): Observable<MessageResponseDto> {
        return defer(() => this.repository.delete(${E}DeleteVo(contract)));
    }
}
`
    );

    w(
        `application/use-cases/${E}/${E}-select.use-case.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}SelectRepository } from '${BASE}/domain/repositories/${E}/${E}-select.repository';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { defer, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}SelectUseCase {
    private readonly repository = inject(${Cap}SelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
`
    );

    w(
        `application/use-cases/${E}/${E}-find-one.use-case.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}FindOneFilterContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.contract';
import { ${Cap}FindOneEntity } from '${BASE}/domain/entities/${E}/${E}-find-one.entity';
import { ${Cap}FindOneRepository } from '${BASE}/domain/repositories/${E}/${E}-find-one.repository';
import { ${E}FindOneFilterVo } from '${BASE}/domain/value-objects/${E}/${E}-find-one-filter.vo';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { defer, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}FindOneUseCase {
    private readonly repository = inject(${Cap}FindOneRepository);

    execute(
        contract: ${Cap}FindOneFilterContract,
        options?: FetchOptions
    ): Observable<${Cap}FindOneEntity> {
        return defer(() =>
            this.repository.execute(${E}FindOneFilterVo(contract), options)
        );
    }
}
`
    );

    // ---------------------------------------------------------------------
    // APPLICATION — services (facades), modele reel infrastructure.facade.ts
    // ---------------------------------------------------------------------

    w(
        `application/services/${E}/${E}.facade.ts`,
        `
import { inject, Injectable, signal } from '@angular/core';
import { ${Cap}CreateCommand } from '${BASE}/application/commands/${E}/${E}-create.command';
import { ${Cap}DeleteCommand } from '${BASE}/application/commands/${E}/${E}-delete.command';
import { ${Cap}UpdateCommand } from '${BASE}/application/commands/${E}/${E}-update.command';
import { ${Cap}CreateBus } from '${BASE}/application/commands-bus/${E}/${E}-create.bus';
import { ${Cap}DeleteBus } from '${BASE}/application/commands-bus/${E}/${E}-delete.bus';
import { ${Cap}UpdateBus } from '${BASE}/application/commands-bus/${E}/${E}-update.bus';
import { ${Cap}CreateDto } from '${BASE}/application/dto/${E}/${E}-create.dto';
import { ${Cap}DeleteDto } from '${BASE}/application/dto/${E}/${E}-delete.dto';
import { ${Cap}FilterDto } from '${BASE}/application/dto/${E}/${E}-filter.dto';
import { ${Cap}UpdateDto } from '${BASE}/application/dto/${E}/${E}-update.dto';
import { ${Cap}Query } from '${BASE}/application/queries/${E}/${E}.query';
import { ${Cap}Bus } from '${BASE}/application/queries-bus/${E}/${E}.bus';
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import { BaseFacade } from '@shared/application/services/base-facade';
import { handleObservableWithFeedback } from '@shared/application/services/facade.utils';
import { PAGINATION_CONST } from '@shared/constants/pagination.constants';
import { UiFeedbackService } from '@shared/domain/services/ui-feedback.service';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}Facade extends BaseFacade<${Cap}Entity, ${Cap}FilterDto> {
    private readonly uiFeedback = inject(UiFeedbackService);
    private readonly filterBus = inject(${Cap}Bus);
    private readonly createBus = inject(${Cap}CreateBus);
    private readonly updateBus = inject(${Cap}UpdateBus);
    private readonly deleteBus = inject(${Cap}DeleteBus);

    private readonly _actionState = signal<'idle' | 'loading'>('idle');
    readonly actionState = this._actionState.asReadonly();

    private readonly _actionSuccess = signal(0);
    readonly actionSuccess = this._actionSuccess.asReadonly();

    private readonly _actionError = signal<unknown | null>(null);
    readonly actionError = this._actionError.asReadonly();

    private hasInitialized = false;
    private lastFetchTimestamp = 0;

    readAll(
        filter: ${Cap}FilterDto,
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
        filter: ${Cap}FilterDto | null,
        page: string,
        options: FetchOptions = {}
    ): void {
        const query = this.buildQuery(filter);
        const fetch$ = this.filterBus.dispatch(query, page, options);
        this.fetchWithFilterAndPage(filter, page, fetch$, this.uiFeedback);
        this.lastFetchTimestamp = Date.now();
    }

    private buildQuery(filter?: ${Cap}FilterDto | null): ${Cap}Query {
        return new ${Cap}Query(filter?.search, filter?.startDate, filter?.endDate);
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

    create(dto: ${Cap}CreateDto): void {
        this._actionState.set('loading');
        const command = new ${Cap}CreateCommand(${FIELD_NAMES.map((f) => `dto?.${f}`).join(', ')});
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

    update(dto: ${Cap}UpdateDto): void {
        this._actionState.set('loading');
        const command = new ${Cap}UpdateCommand(
            dto?.uniqId,
${FIELD_NAMES.map((f) => `            dto?.${f}`).join(',\n')}
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

    delete(dto: ${Cap}DeleteDto): void {
        const command = new ${Cap}DeleteCommand(dto.uniqId);
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
`
    );

    w(
        `application/services/${E}/${E}-select.facade.ts`,
        `
import { inject, Injectable } from '@angular/core';
import { ${Cap}SelectUseCase } from '${BASE}/application/use-cases/${E}/${E}-select.use-case';
import { ArrayBaseFacade } from '@shared/application/services/array-base-facade';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { UiFeedbackService } from '@shared/domain/services/ui-feedback.service';
import { FetchOptions } from '@shared/interface/fetch-options.interface';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}SelectFacade extends ArrayBaseFacade<SelectOption, void> {
    private readonly uiFeedback = inject(UiFeedbackService);
    private readonly useCase = inject(${Cap}SelectUseCase);

    readAll(options: FetchOptions = {}): void {
        this.fetchWithFilter(
            null,
            this.useCase.readAll.bind(this.useCase, options),
            this.uiFeedback
        );
    }
}
`
    );

    w(
        `application/services/${E}/${E}-find-one.facade.ts`,
        `
import { inject, Injectable } from '@angular/core';
import { ${Cap}FindOneFilterDto } from '${BASE}/application/dto/${E}/${E}-find-one-filter.dto';
import { ${Cap}FindOneQuery } from '${BASE}/application/queries/${E}/${E}-find-one.query';
import { ${Cap}FindOneBus } from '${BASE}/application/queries-bus/${E}/${E}-find-one.bus';
import { ${Cap}FindOneEntity } from '${BASE}/domain/entities/${E}/${E}-find-one.entity';
import { ObjectBaseFacade } from '@shared/application/services/object-base-facade';
import { UiFeedbackService } from '@shared/domain/services/ui-feedback.service';
import { FetchOptions } from '@shared/interface/fetch-options.interface';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}FindOneFacade extends ObjectBaseFacade<${Cap}FindOneEntity, ${Cap}FindOneFilterDto> {
    private readonly ui = inject(UiFeedbackService);
    private readonly bus = inject(${Cap}FindOneBus);

    read(filter: ${Cap}FindOneFilterDto, options: FetchOptions = {}): void {
        const command = new ${Cap}FindOneQuery(filter.uniqId);
        const fetch$ = this.bus.dispatch(command, options);
        this.fetch(filter, fetch$, this.ui);
    }
}
`
    );
}
