// X5 C2 : rendu Angular d'une lecture list-query v2 au profil EXTÉRIEUR
// (D-X5-2, D-X5-4, D-X5-6). Seul rendu de ce profil ; le rendu interne le
// refuse, et celui-ci refuse tout modèle interne.
//
// - Décodeur projeté : le décodeur partagé, sans contrôle des champs non lus.
// - Source : contexte HTTP propre, authentification seule, aucun jeton de
//   cache (la coque impose déjà `no-store` et n'a aucun cache).
// - Façade de session : écarte les valeurs d'un principal précédent (époque),
//   et une lecture en échec EFFACE ses lignes, y compris celles retenues pour
//   un rechargement : aucune donnée périmée après un échec.
import { EXTERNAL_QUERY_STATES } from '../core/list-query-external-profile.mjs';
import { renderAngularListQuerySource } from './angular-list-query-v2-renderer.mjs';
import {
    assertListQueryV2RendererModel,
    renderListQueryV2Decoder,
    renderListQueryV2Models,
} from './list-query-v2-renderer-shared.mjs';
import { pascalCase } from './shared.mjs';

// Même motif que le schéma des liaisons d'hôte de session.
const SESSION_MODULE =
    /^(?:[@A-Za-z0-9][@A-Za-z0-9._/-]*|(?:\.\/|(?:\.\.\/){1,8})[A-Za-z0-9][A-Za-z0-9._/-]*)$/;

function fail(message) {
    throw new Error(`angular external list-query renderer: ${message}`);
}

export function renderExternalQueryFacade(query, binding) {
    const base = pascalCase(query.id);
    const input = query.port.input.kind === 'object';
    const paged = query.transport.result.kind === 'page';
    const type = paged
        ? base + 'Page'
        : `readonly ${pascalCase(query.read_model.id)}[]`;
    const protectedQuery = query.request_policy.authentication.mode === 'host';
    const connected = protectedQuery ? '!this.session.connected() || ' : '';
    return `import { Service, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, defer, map, throwError } from 'rxjs';
import { APPLICATION_SESSION } from '${binding.module}';
import { ${base}Source } from './${query.id}.source';
import type { ${paged ? base + 'Page' : pascalCase(query.read_model.id)}${input ? ', ' + base + 'Input' : ''} } from './models';

interface QueryParams { readonly request: number; ${input ? 'readonly input: ' + base + 'Input;' : ''} }
// Repli vide partagé et gelé (X5 C4, F-d) : jamais un tableau neuf mutable.
const NO_ROWS: readonly ${paged ? base + 'Page' : pascalCase(query.read_model.id)}${paged ? "['items'][number]" : ''}[] = Object.freeze([]);
class SessionQueryFailure extends Error {
    readonly code = 'QUERY_FAILURE';
    constructor(readonly statusCode: number, readonly epoch: number) { super('La lecture ne peut pas être effectuée.'); this.name = 'SessionQueryFailure'; }
}
export type ${base}State = ${EXTERNAL_QUERY_STATES.map((state) => `'${state}'`).join(' | ')};
@Service({ autoProvided: false })
export class ${base}Facade {
    private readonly source = inject(${base}Source);
    private readonly session = inject(APPLICATION_SESSION);
    private requests = 0;
    private readonly params = signal<QueryParams | undefined>(undefined);
    private readonly lastResolved = signal<{ readonly epoch: number; readonly value: ${type} } | undefined>(undefined);
    private readonly resource = rxResource({
        params: () => { const epoch = this.session.epoch(); const input = this.params(); return ${connected}input === undefined ? undefined : { input, epoch }; },
        stream: ({ params }) => defer(() => this.source.readAll(${input ? 'params.input.input' : ''})).pipe(
            map((value) => {
                if (params.epoch !== this.session.epoch()) throw new SessionQueryFailure(0, params.epoch);
                const resolved = Object.freeze({ epoch: params.epoch, value });
                this.lastResolved.set(resolved); return resolved;
            }),
            catchError((error: unknown) => {
                // D-X5-6 : seul mécanisme d'effacement ; en échec, la ressource
                // n'a plus de valeur et rien n'est retenu.
                this.lastResolved.set(undefined);
                return throwError(() => error instanceof SessionQueryFailure ? error : new SessionQueryFailure(error instanceof HttpErrorResponse && Number.isInteger(error.status) && error.status >= 0 && error.status <= 599 ? error.status : 0, params.epoch));
            })
        ),
    });
    readonly value = computed(() => {
        if (${connected}!this.resource.hasValue()) return undefined;
        const value = this.resource.value(); return value.epoch === this.session.epoch() ? value.value : undefined;
    });
    private readonly retained = computed(() => {
        const value = this.lastResolved(); return ${protectedQuery ? 'this.session.connected() && ' : ''}value?.epoch === this.session.epoch() ? value?.value : undefined;
    });
    readonly isLoading = this.resource.isLoading;
    readonly status = this.resource.status;
    ${
        paged
            ? `readonly page = computed(() => this.value() ?? this.retained());
    readonly items = computed(() => this.page()?.items ?? NO_ROWS);
    // Pagination sans les lignes, construite puis gelée (X5 C4, F-d).
    readonly pagination = computed(() => {
        const page = this.page();
        return page === undefined ? undefined : Object.freeze({ currentPage: page.currentPage, lastPage: page.lastPage, pageSize: page.pageSize, totalItems: page.totalItems });
    });`
            : `readonly items = computed(() => this.value() ?? this.retained() ?? NO_ROWS);
    readonly pagination = computed(() => undefined);`
    }
    readonly error = computed(() => { const error = this.resource.error(); return error instanceof SessionQueryFailure && error.epoch === this.session.epoch() ? error : undefined; });
    readonly state = computed<${base}State>(() => { ${protectedQuery ? "if (!this.session.connected()) return 'idle'; " : ''}const status = this.status(); return status === 'resolved' || status === 'local' ? this.items().length ? 'success' : 'empty' : status; });
    constructor() { effect(() => { if (this.lastResolved()?.epoch !== this.session.epoch()) this.lastResolved.set(undefined); }); }
    load(${input ? 'input: ' + base + 'Input' : ''}): void {
        this.params.set({ request: ++this.requests${input ? ', input' : ''} });
    }
    reload(): void { this.resource.reload(); }
}
`;
}

export function renderAngularExternalListQuery(model, binding) {
    const query = assertListQueryV2RendererModel(model, 'angular', {
        page: true,
        queryParameters: true,
        external: true,
    });
    if (
        !SESSION_MODULE.test(binding?.module ?? '') ||
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(binding?.token ?? '')
    ) {
        fail(`unsafe host binding for ${query.transport.service_id}`);
    }
    const files = {
        'src/models.ts': renderListQueryV2Models(query, 'angular'),
        [`src/${query.id}.decoder.ts`]: renderListQueryV2Decoder(
            query,
            'angular',
            binding.module
        ),
        [`src/${query.id}.source.ts`]: renderAngularListQuerySource(
            query,
            binding,
            true
        ),
        [`src/${query.id}.facade.ts`]: renderExternalQueryFacade(
            query,
            binding
        ),
        'src/index.ts': `export * from './models';\nexport * from './${query.id}.decoder';\nexport * from './${query.id}.source';\nexport * from './${query.id}.facade';\n`,
    };
    return { files, queryId: query.id };
}
