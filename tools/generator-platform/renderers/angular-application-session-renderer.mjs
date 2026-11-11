import { readFile } from 'node:fs/promises';
import { sessionRenderConfiguration } from '../core/application-design-session.mjs';
import { pascalCase } from './shared.mjs';

export const SESSION_NATIVE_SOURCES = Object.freeze({
    'auth-context.token.ts':
        'libs/core/src/lib/interceptors/auth-context.token.ts',
    'action-request-request-context.ts':
        'libs/core/src/lib/interceptors/action-request-request-context.ts',
    'cache-context.token.ts':
        'libs/core/src/lib/interceptors/cache-context.token.ts',
    'list-query-request-context.ts':
        'libs/core/src/lib/interceptors/list-query-request-context.ts',
    'native-errors/domain-error.abstract.ts':
        'libs/shared/domain/src/lib/errors/domain-error.abstract.ts',
    'native-errors/http/invalid-payload.error.ts':
        'libs/shared/domain/src/lib/errors/http/invalid-payload.error.ts',
    'native-errors/http/server-response.error.ts':
        'libs/shared/domain/src/lib/errors/http/server-response.error.ts',
});

function sessionTypes() {
    return `import { InjectionToken } from '@angular/core';

export interface SessionProducer {
    readonly page_id: string;
    readonly action_id: string;
    readonly response_status: number;
    readonly result_model_id: string;
}
export interface SessionStage {
    readonly id: string;
    readonly page_id: string;
    readonly predicate: { readonly pointer: string; readonly operator: 'is-null' | 'is-true' };
    readonly completion: {
        readonly producer: SessionProducer;
        readonly effect: 'acknowledge' | 'clear-and-reconnect';
        readonly result_condition?: { readonly pointer: string; readonly equals: boolean };
    };
}
export interface SessionRoute {
    readonly page_id: string;
    readonly path: string;
    readonly access: { readonly mode: 'public' | 'authenticated' | 'authorized'; readonly permissions: readonly string[] };
}
export interface SessionConfiguration {
    readonly storage: 'memory';
    readonly producer: SessionProducer;
    readonly projection: {
        readonly token_pointer: string; readonly subject_pointer: string;
        readonly menu_pointer: string; readonly allowed_paths_pointer: string;
        readonly permissions_pointer?: string;
    };
    readonly stages: readonly SessionStage[];
    readonly landing_page_id: string;
    readonly reconnect_page_id: string;
    readonly logout_label: string;
    readonly menu: { readonly label_pointer: string; readonly path_pointer: string; readonly children_pointer?: string };
    readonly protected_operations: readonly {
        readonly contract_id: string; readonly service_id: string; readonly operation_id: string;
        readonly method: string; readonly path: string; readonly security_scheme_id: string;
    }[];
    readonly routes: readonly SessionRoute[];
}
export interface SessionEndpoint {
    readonly contract_id: string;
    readonly service_id: string;
    readonly base_url: string;
}
export interface SessionMenuItem {
    readonly id: string;
    readonly label: string;
    readonly path: string | null;
    readonly children: readonly SessionMenuItem[];
}
export interface ApplicationSessionPort {
    epoch(): number;
    connected(): boolean;
    establish(producer: SessionProducer, result: unknown, epoch: number): string;
    complete(stageId: string, producer: SessionProducer, result: unknown, epoch: number): string;
}
export const APPLICATION_SESSION = new InjectionToken<ApplicationSessionPort>('Application session');
export const SESSION_ENDPOINTS = new InjectionToken<readonly SessionEndpoint[]>('Session endpoint bindings', { factory: () => Object.freeze([]) });
`;
}

export function renderSessionProjection() {
    return `import type { SessionConfiguration, SessionMenuItem, SessionRoute } from './session.types';

export class SessionFailure extends Error {
    constructor(readonly code: 'SESSION_REQUIRED' | 'SESSION_CHANGED' | 'SESSION_RESULT' | 'SESSION_ENDPOINT') {
        super('La session ne peut pas être utilisée.'); this.name = 'SessionFailure';
    }
}
export function own(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object') return undefined;
    const entry = Object.getOwnPropertyDescriptor(value, key);
    if (!entry) return undefined;
    if (!Object.hasOwn(entry, 'value') || !entry.enumerable) throw new SessionFailure('SESSION_RESULT');
    return entry.value;
}
export function pointer(value: unknown, path: string): unknown {
    if (path.length > 256 || (path && !path.startsWith('/')) || /~(?:[^01]|$)/.test(path)) throw new SessionFailure('SESSION_RESULT');
    let current = value;
    if (!path) return current;
    for (const token of path.slice(1).split('/')) {
        const key = token.replaceAll('~1', '/').replaceAll('~0', '~');
        if (Array.isArray(current) && !/^(0|[1-9][0-9]*)$/.test(key)) return undefined;
        current = own(current, key);
    }
    return current;
}
export function canonicalPath(value: unknown): string | null {
    return typeof value === 'string' && value.length <= 512 &&
        (value === '/' || /^\\/(?:[A-Za-z0-9_-]+\\/)*[A-Za-z0-9_-]+$/.test(value)) &&
        value.split('/').length <= 33 ? value : null;
}
export function snapshot(value: unknown): unknown {
    let nodes = 32768;
    const ancestors = new WeakSet<object>();
    function clone(current: unknown, depth: number): unknown {
        if (--nodes < 0 || depth > 32) throw new SessionFailure('SESSION_RESULT');
        if (current === null || typeof current === 'boolean' || (typeof current === 'number' && Number.isFinite(current))) return current;
        if (typeof current === 'string' && current.length <= 8192) return current;
        if (!current || typeof current !== 'object' || ancestors.has(current)) throw new SessionFailure('SESSION_RESULT');
        const array = Array.isArray(current);
        if (array && Object.getPrototypeOf(current) !== Array.prototype) throw new SessionFailure('SESSION_RESULT');
        if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(current))) throw new SessionFailure('SESSION_RESULT');
        const keys = Reflect.ownKeys(current);
        if ((array && current.length > 2048) || (!array && keys.length > 160) ||
            keys.some((key) => typeof key !== 'string' || key.length > 256)) throw new SessionFailure('SESSION_RESULT');
        ancestors.add(current);
        try {
            if (Array.isArray(current)) {
                if (keys.length !== current.length + 1) throw new SessionFailure('SESSION_RESULT');
                const items: unknown[] = [];
                for (let index = 0; index < current.length; index++) {
                    const item = own(current, String(index));
                    if (item === undefined) throw new SessionFailure('SESSION_RESULT');
                    items.push(clone(item, depth + 1));
                }
                return Object.freeze(items);
            }
            const result: Record<string, unknown> = Object.create(null);
            for (const key of Object.keys(current)) Object.defineProperty(result, key, { value: clone(own(current, key), depth + 1), enumerable: true });
            if (Object.keys(current).length !== keys.length) throw new SessionFailure('SESSION_RESULT');
            return Object.freeze(result);
        } finally { ancestors.delete(current); }
    }
    return clone(value, 0);
}
export function stringList(value: unknown): readonly string[] {
    if (!Array.isArray(value) || value.length > 2048 || value.some((entry: unknown) => typeof entry !== 'string' || entry.length > 512))
        throw new SessionFailure('SESSION_RESULT');
    return Object.freeze(value.map((entry: unknown) => {
        if (typeof entry !== 'string') throw new SessionFailure('SESSION_RESULT');
        return entry;
    }));
}
export function routePermitted(route: SessionRoute, permissions: readonly string[]): boolean {
    return route.access.mode !== 'authorized' || route.access.permissions.every((permission) => permissions.includes(permission));
}
export function sessionMenu(value: unknown, paths: readonly string[], permissions: readonly string[], config: SessionConfiguration): readonly SessionMenuItem[] {
    const available: ReadonlySet<string> = new Set<string>(config.routes.filter((route) => route.access.mode !== 'public' &&
        !config.stages.some((stage) => stage.page_id === route.page_id) && routePermitted(route, permissions)).map((route) => route.path));
    const allowed: ReadonlySet<string> = new Set<string>(paths.filter((path) => canonicalPath(path) && available.has(path)));
    let remaining = 512;
    function visit(items: unknown, depth: number, prefix: string): readonly SessionMenuItem[] {
        if (items === undefined || items === null) return Object.freeze([]);
        if (!Array.isArray(items) || items.length > 128 || depth > 32) throw new SessionFailure('SESSION_RESULT');
        const menu: SessionMenuItem[] = [];
        for (const [index, item] of items.entries()) {
            if (--remaining < 0) throw new SessionFailure('SESSION_RESULT');
            const label = pointer(item, config.menu.label_pointer);
            if (typeof label !== 'string' || !label.trim() || label.length > 160) throw new SessionFailure('SESSION_RESULT');
            const id = prefix + '-' + index;
            const children: readonly SessionMenuItem[] = config.menu.children_pointer === undefined ? Object.freeze([]) : visit(pointer(item, config.menu.children_pointer), depth + 1, id);
            const candidate = canonicalPath(pointer(item, config.menu.path_pointer));
            const path = candidate && allowed.has(candidate) ? candidate : null;
            if (path || children.length) menu.push(Object.freeze({ id, label: label.replace(/[\\u0000-\\u001f\\u007f]/g, ' '), path, children }));
        }
        return Object.freeze(menu);
    }
    return visit(value, 0, 'item');
}
`;
}

function sessionStore(config) {
    return `import { computed, inject, Service, signal } from '@angular/core';
import type { HttpRequest } from '@angular/common/http';
import { SESSION_ENDPOINTS, type ApplicationSessionPort, type SessionConfiguration, type SessionProducer, type SessionMenuItem } from './session.types';
import { pointer, snapshot, stringList, sessionMenu, routePermitted, SessionFailure } from './session.projection';

export const SESSION_CONFIGURATION: SessionConfiguration = ${JSON.stringify(config)};
interface MemorySession {
    readonly token: string;
    readonly result: unknown;
    readonly paths: readonly string[];
    readonly permissions: readonly string[];
    readonly acknowledged: ReadonlySet<string>;
}
function sameProducer(left: SessionProducer, right: SessionProducer): boolean {
    return left.page_id === right.page_id && left.action_id === right.action_id &&
        left.response_status === right.response_status && left.result_model_id === right.result_model_id;
}
@Service({ autoProvided: true })
export class ApplicationSession implements ApplicationSessionPort {
    private readonly endpoints = inject(SESSION_ENDPOINTS);
    private readonly state = signal<MemorySession | null>(null);
    private readonly generation = signal(0);
    readonly epoch = this.generation.asReadonly();
    readonly connected = computed(() => this.state() !== null);
    readonly stage = computed(() => {
        const session = this.state();
        if (!session) return null;
        return SESSION_CONFIGURATION.stages.find((stage) => !session.acknowledged.has(stage.id) &&
            (stage.predicate.operator === 'is-null' ? pointer(session.result, stage.predicate.pointer) === null :
                pointer(session.result, stage.predicate.pointer) === true)) ?? null;
    });
    readonly menu = computed<readonly SessionMenuItem[]>(() => {
        const state = this.state();
        return !state || this.stage() ? Object.freeze([]) : sessionMenu(pointer(state.result, SESSION_CONFIGURATION.projection.menu_pointer), state.paths, state.permissions, SESSION_CONFIGURATION);
    });
    path(pageId: string): string {
        const route = SESSION_CONFIGURATION.routes.find((entry) => entry.page_id === pageId);
        if (!route) throw new SessionFailure('SESSION_RESULT');
        return route.path;
    }
    nextPath(): string { return this.path(!this.connected() ? SESSION_CONFIGURATION.reconnect_page_id : this.stage()?.page_id ?? SESSION_CONFIGURATION.landing_page_id); }
    establish(producer: SessionProducer, result: unknown, epoch: number): string {
        if (epoch !== this.epoch()) throw new SessionFailure('SESSION_CHANGED');
        if (!sameProducer(producer, SESSION_CONFIGURATION.producer)) throw new SessionFailure('SESSION_RESULT');
        const candidate = snapshot(result);
        const projection = SESSION_CONFIGURATION.projection;
        const token = pointer(candidate, projection.token_pointer);
        const subject = pointer(candidate, projection.subject_pointer);
        if (typeof token !== 'string' || !token || token.length > 8192 || /\\s|[\\u0000-\\u001f\\u007f]/.test(token) ||
            !subject || typeof subject !== 'object' || Array.isArray(subject)) throw new SessionFailure('SESSION_RESULT');
        const paths = stringList(pointer(candidate, projection.allowed_paths_pointer));
        const permissions: readonly string[] = projection.permissions_pointer === undefined ? Object.freeze([]) : stringList(pointer(candidate, projection.permissions_pointer));
        for (const stage of SESSION_CONFIGURATION.stages) {
            const value = pointer(candidate, stage.predicate.pointer);
            if (value === undefined || (stage.predicate.operator === 'is-true' && typeof value !== 'boolean')) throw new SessionFailure('SESSION_RESULT');
        }
        sessionMenu(pointer(candidate, projection.menu_pointer), paths, permissions, SESSION_CONFIGURATION);
        this.generation.update((value) => value + 1);
        this.state.set(Object.freeze({ token, result: candidate, paths, permissions, acknowledged: new Set<string>() }));
        return this.nextPath();
    }
    complete(stageId: string, producer: SessionProducer, result: unknown, epoch: number): string {
        if (epoch !== this.epoch()) throw new SessionFailure('SESSION_CHANGED');
        const state = this.state();
        const stage = this.stage();
        if (!state || !stage || stage.id !== stageId || !sameProducer(producer, stage.completion.producer)) throw new SessionFailure('SESSION_RESULT');
        const condition = stage.completion.result_condition;
        if (condition && pointer(snapshot(result), condition.pointer) !== condition.equals) throw new SessionFailure('SESSION_RESULT');
        if (stage.completion.effect === 'clear-and-reconnect') this.clear(epoch);
        else {
            this.generation.update((value) => value + 1);
            this.state.set(Object.freeze({ ...state, acknowledged: new Set<string>([...state.acknowledged, stageId]) }));
        }
        return this.nextPath();
    }
    clear(epoch = this.epoch()): boolean {
        if (epoch !== this.epoch()) return false;
        const wasConnected = this.connected();
        this.generation.update((value) => value + 1);
        this.state.set(null);
        return wasConnected;
    }
    destination(pageId: string): string | null {
        const route = SESSION_CONFIGURATION.routes.find((entry) => entry.page_id === pageId);
        if (!route) return this.nextPath();
        if (route.access.mode === 'public') return this.connected() ? this.nextPath() : null;
        if (!this.connected()) return this.nextPath();
        const stage = this.stage();
        if (stage) return pageId === stage.page_id ? null : this.path(stage.page_id);
        if (pageId === SESSION_CONFIGURATION.landing_page_id) return null;
        const state = this.state();
        return state && state.paths.includes(route.path) && routePermitted(route, state.permissions) ? null : this.nextPath();
    }
    authorize<T>(request: HttpRequest<T>): HttpRequest<T> | null {
        // Chemin BRUT anormal, avant toute normalisation (CI #389, frontière du
        // Bearer) : %, \\ ou segment . ou .. ne reçoivent jamais le Bearer, même
        // s'ils se normalisent vers un chemin déclaré. L'analyseur d'URL décode
        // %2e%2e en .. et le retire : le contrôle doit précéder new URL.
        const rawPath = request.url.split(/[?#]/)[0];
        if (/[%\\\\]/.test(rawPath) || /(?:^|\\/)\\.\\.?(?:\\/|$)/.test(rawPath)) return null;
        const matches = SESSION_CONFIGURATION.protected_operations.filter((operation) => {
            if (operation.method !== request.method) return false;
            const endpoints = this.endpoints.filter((endpoint) => endpoint.contract_id === operation.contract_id && endpoint.service_id === operation.service_id);
            if (endpoints.length !== 1) return false;
            try {
                const base = new URL(endpoints[0].base_url);
                const url = new URL(request.url, base.origin);
                if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash ||
                    /[%\\\\]/.test(base.pathname) || url.username || url.password || url.hash || /[%\\\\]/.test(url.pathname)) return false;
                const path = base.pathname.replace(/\\/$/, '') + operation.path;
                return url.origin === base.origin && url.pathname === path;
            } catch { return false; }
        });
        if (matches.length !== 1) return null;
        const token = this.state()?.token;
        if (!token) throw new SessionFailure('SESSION_REQUIRED');
        return request.clone({ setHeaders: { Authorization: 'Bearer ' + token }, cache: 'no-store', redirect: 'error', credentials: 'omit', transferCache: false });
    }
}
`;
}

function sessionHttp() {
    return `import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { SKIP_AUTH } from './auth-context.token';
import { catchError, map, throwError } from 'rxjs';
import { ApplicationSession } from './session.store';
import { SessionFailure } from './session.projection';

export const applicationSessionInterceptor: HttpInterceptorFn = (request, next) => {
    const session = inject(ApplicationSession);
    const router = inject(Router);
    if (request.context.get(SKIP_AUTH)) return next(request.clone({ cache: 'no-store', redirect: 'error', credentials: 'omit', transferCache: false }));
    const protectedRequest = session.authorize(request);
    if (!protectedRequest) return next(request);
    const epoch = session.epoch();
    return next(protectedRequest).pipe(
        map((event) => {
            if (session.epoch() !== epoch) throw new SessionFailure('SESSION_CHANGED');
            return event;
        }),
        catchError((error: unknown) => {
            if (session.epoch() !== epoch) return throwError(() => new SessionFailure('SESSION_CHANGED'));
            if (error instanceof HttpErrorResponse && error.status === 401 && session.clear(epoch))
                void router.navigateByUrl(session.nextPath(), { replaceUrl: true });
            return throwError(() => error);
        })
    );
};
`;
}

function sessionGuard() {
    return `import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ApplicationSession } from './session.store';

export const applicationSessionGuard: CanActivateFn = (route) => {
    const session = inject(ApplicationSession);
    const router = inject(Router);
    const pageId: unknown = route.data['page_id'];
    const destination = typeof pageId === 'string' ? session.destination(pageId) : session.nextPath();
    return destination === null ? true : router.parseUrl(destination);
};
`;
}

function navigationComponent() {
    return `import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { SessionMenuItem } from './session.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-session-menu',
    imports: [RouterLink, RouterLinkActive, forwardRef(() => ApplicationSessionMenu)],
    template: \`<ul>
        @for (item of items(); track item.id) {
            <li>
                @if (item.children.length) {
                    <details><summary>{{ item.label }}</summary>
                        @if (item.path) { <a [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{ item.label }}</a> }
                        <app-session-menu [items]="item.children" />
                    </details>
                } @else if (item.path) {
                    <a [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{ item.label }}</a>
                }
            </li>
        }
    </ul>\`,
    styles: \`ul { list-style: none; padding-inline-start: .75rem; margin: 0; }
        a, summary { display: block; padding: .75rem; overflow-wrap: anywhere; }
        summary { cursor: pointer; } .active { font-weight: 700; }
        :focus-visible { outline: 3px solid #005fcc; outline-offset: 2px; }\`,
})
export class ApplicationSessionMenu { readonly items = input.required<readonly SessionMenuItem[]>(); }
`;
}

export function renderAngularSessionPortTypes() {
    return sessionTypes();
}

export const sessionEndpointToken = (serviceId) =>
    serviceId.replace(/[._-]/g, '_').toUpperCase() + '_API_URL';

export async function renderSessionHostSupport() {
    const files = { 'session.types.ts': sessionTypes() };
    for (const [target, source] of Object.entries(SESSION_NATIVE_SOURCES))
        files[target] = await readFile(
            new URL('../../../' + source, import.meta.url),
            'utf8'
        );
    files['index.ts'] = `export * from './session.types';
export * from './auth-context.token';
export * from './action-request-request-context';
export * from './cache-context.token';
export * from './list-query-request-context';
export * from './native-errors/http/invalid-payload.error';
export * from './native-errors/http/server-response.error';
`;
    return files;
}

// Services de la session : identifiant → contrat, sans collision de nom de
// jeton. Source des jetons de service et, en extérieur, du relais (X4-config).
export function sessionServices(config) {
    const services = new Map();
    for (const operation of config.protected_operations) {
        const previous = services.get(operation.service_id);
        if (previous && previous !== operation.contract_id)
            throw new Error('APP_SESSION_ENDPOINT_COLLISION');
        services.set(operation.service_id, operation.contract_id);
    }
    if (
        new Set([...services.keys()].map(sessionEndpointToken)).size !==
        services.size
    )
        throw new Error('APP_SESSION_ENDPOINT_COLLISION');
    return services;
}

export function renderSessionEndpointTokens(config) {
    const services = sessionServices(config);
    return `import { InjectionToken, inject } from '@angular/core';
import { SESSION_ENDPOINTS } from './session.types';
import { SessionFailure } from './session.projection';
${[...services]
    .map(
        ([
            serviceId,
            contractId,
        ]) => `export const ${sessionEndpointToken(serviceId)} = new InjectionToken<string>(${JSON.stringify(serviceId)}, {
    factory: () => {
        const endpoints = inject(SESSION_ENDPOINTS).filter((endpoint) => endpoint.contract_id === ${JSON.stringify(contractId)} && endpoint.service_id === ${JSON.stringify(serviceId)});
        if (endpoints.length !== 1) throw new SessionFailure('SESSION_ENDPOINT');
        const raw = endpoints[0].base_url;
        if (typeof raw !== 'string' || raw !== raw.trim() || /\\s|[%\\\\]/.test(raw) || /(?:^|\\/)\\.\\.?(?:\\/|$)/.test(raw)) throw new SessionFailure('SESSION_ENDPOINT');
        let url: URL;
        try { url = new URL(raw); } catch { throw new SessionFailure('SESSION_ENDPOINT'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new SessionFailure('SESSION_ENDPOINT');
        return url.href.replace(/\\/$/, '');
    },
});`
    )
    .join('\n')}
`;
}

export function renderSessionQueryFacade(query, binding) {
    const base = pascalCase(query.id);
    const input = query.port.input.kind === 'object';
    const paged = query.transport.result.kind === 'page';
    const type = paged
        ? base + 'Page'
        : `readonly ${pascalCase(query.read_model.id)}[]`;
    const protectedQuery = query.request_policy.authentication.mode === 'host';
    return `import { Service, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, defer, map, throwError } from 'rxjs';
import { APPLICATION_SESSION } from '${binding.module}';
import { ${base}Source } from './${query.id}.source';
import type { ${paged ? base + 'Page' : pascalCase(query.read_model.id)}${input ? ', ' + base + 'Input' : ''} } from './models';

interface QueryParams { readonly forceRefresh: boolean; ${input ? 'readonly input: ' + base + 'Input;' : ''} }
class SessionQueryFailure extends Error {
    readonly code = 'QUERY_FAILURE';
    constructor(readonly statusCode: number, readonly epoch: number) { super('La lecture ne peut pas être effectuée.'); this.name = 'SessionQueryFailure'; }
}
export type ${base}State = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'reloading';
@Service({ autoProvided: false })
export class ${base}Facade {
    private readonly source = inject(${base}Source);
    private readonly session = inject(APPLICATION_SESSION);
    private readonly params = signal<QueryParams | undefined>(undefined);
    private readonly lastResolved = signal<{ readonly epoch: number; readonly value: ${type} } | undefined>(undefined);
    private readonly resource = rxResource({
        params: () => { const epoch = this.session.epoch(); const input = this.params(); return ${protectedQuery ? '!this.session.connected() || ' : ''}input === undefined ? undefined : { input, epoch }; },
        stream: ({ params, previous }) => defer(() => this.source.readAll(${input ? 'params.input.input, ' : ''}params.input.forceRefresh || previous.status !== 'idle')).pipe(
            map((value) => {
                if (params.epoch !== this.session.epoch()) throw new SessionQueryFailure(0, params.epoch);
                const resolved = Object.freeze({ epoch: params.epoch, value });
                this.lastResolved.set(resolved); return resolved;
            }),
            catchError((error: unknown) => throwError(() => new SessionQueryFailure(error instanceof HttpErrorResponse && Number.isInteger(error.status) && error.status >= 0 && error.status <= 599 ? error.status : 0, params.epoch)))
        ),
    });
    readonly value = computed(() => {
        if (${protectedQuery ? '!this.session.connected() || ' : ''}!this.resource.hasValue()) return undefined;
        const value = this.resource.value(); return value.epoch === this.session.epoch() ? value.value : undefined;
    });
    private readonly retained = computed(() => {
        const value = this.lastResolved(); return ${protectedQuery ? 'this.session.connected() && ' : ''}value?.epoch === this.session.epoch() ? value?.value : undefined;
    });
    ${paged ? 'readonly page = computed(() => this.value() ?? this.retained());\n    readonly items = computed(() => this.page()?.items ?? []);' : 'readonly items = computed(() => this.value() ?? this.retained() ?? []);'}
    readonly isLoading = this.resource.isLoading;
    readonly status = this.resource.status;
    readonly error = computed(() => { const error = this.resource.error(); return error instanceof SessionQueryFailure && error.epoch === this.session.epoch() ? error : undefined; });
    readonly state = computed<${base}State>(() => { ${protectedQuery ? "if (!this.session.connected()) return 'idle'; " : ''}const status = this.status(); return status === 'resolved' || status === 'local' ? this.items().length ? 'success' : 'empty' : status; });
    constructor() { effect(() => { if (this.lastResolved()?.epoch !== this.session.epoch()) this.lastResolved.set(undefined); }); }
    load(${input ? 'input: ' + base + 'Input, ' : ''}options: { readonly forceRefresh?: boolean } = {}): void {
        this.params.set({ ${input ? 'input, ' : ''}forceRefresh: options.forceRefresh ?? false });
    }
    reload(): void { this.resource.reload(); }
}
`;
}

function sessionApp(design) {
    return `import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApplicationSession, SESSION_CONFIGURATION } from './session/session.store';
import { ApplicationSessionMenu } from './session/session-menu';

@Component({
    selector: 'app-root', changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet, ApplicationSessionMenu],
    template: \`<a class="skip" href="#app-main">Aller au contenu</a>
        <header><span>{{ title }}</span>
            @if (session.connected()) {
                <button id="navigation-toggle" type="button" aria-controls="application-navigation" [attr.aria-expanded]="menuOpen()" (click)="menuOpen.set(!menuOpen())">Navigation</button>
                <button type="button" (click)="logout()">{{ logoutLabel }}</button>
            }
        </header>
        <div class="layout" [class.authenticated]="session.connected()">
            @if (session.connected()) {
                <nav id="application-navigation" tabindex="-1" aria-label="Navigation principale" [class.is-open]="menuOpen()" (keydown.escape)="closeMenu()">
                    <app-session-menu [items]="session.menu()" />
                </nav>
            }
            <main id="app-main" tabindex="-1"><router-outlet /></main>
        </div>\`,
    styles: \`:host { display: block; min-inline-size: 0; }
        .skip { position: absolute; inset-inline-start: .5rem; inset-block-start: -5rem; z-index: 2; background: white; padding: .75rem; }
        .skip:focus { inset-block-start: .5rem; }
        header { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; padding: 1rem; border-block-end: 1px solid #ccc; }
        header span { flex: 1; overflow-wrap: anywhere; }
        button { min-block-size: 44px; padding: .5rem .75rem; }
        .layout { display: grid; grid-template-columns: minmax(0, 1fr); }
        nav { display: none; padding: .5rem; border-block-end: 1px solid #ccc; overflow-wrap: anywhere; }
        nav.is-open { display: block; }
        main { min-inline-size: 0; padding: clamp(.75rem, 2vw, 2rem); }
        :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
        @media (min-width: 48rem) {
            .layout.authenticated { grid-template-columns: minmax(12rem, 18rem) minmax(0, 1fr); }
            nav { display: block; border-inline-end: 1px solid #ccc; border-block-end: 0; }
            #navigation-toggle { display: none; }
        }\`,
})
export class App {
    readonly session = inject(ApplicationSession);
    readonly menuOpen = signal(false);
    readonly title = ${JSON.stringify(design.design.title)};
    readonly logoutLabel = SESSION_CONFIGURATION.logout_label;
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    constructor() {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
            this.menuOpen.set(false);
            afterNextRender(() => this.document.getElementById('app-main')?.focus(), { injector: this.injector });
        });
    }
    closeMenu(): void {
        if (!this.menuOpen()) return;
        this.menuOpen.set(false);
        this.document.getElementById('navigation-toggle')?.focus();
    }
    logout(): void { this.session.clear(); void this.router.navigateByUrl(this.session.nextPath(), { replaceUrl: true }); }
}
`;
}

function sessionRoutes(config) {
    return `import type { Routes } from '@angular/router';
import { applicationSessionGuard } from './session/session.guard';

export const appRoutes: Routes = [
${config.routes.map((route) => `    { path: ${JSON.stringify(route.path === '/' ? '' : route.path.slice(1))}, data: { page_id: ${JSON.stringify(route.page_id)} }, canActivate: [applicationSessionGuard], loadComponent: () => import('./pages/${route.page_id}/page.component').then((module) => module.PageComponent) },`).join('\n')}
    { path: '**', redirectTo: ${JSON.stringify(config.routes.find((route) => route.page_id === config.reconnect_page_id).path)} },
];
`;
}

function sessionWorker() {
    return `const CACHE = 'cmz-session-static-v1';
const STATIC = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC))); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin || url.search || !STATIC.includes(url.pathname)) return;
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
`;
}

// Mode extérieur seulement : `create-app --target-root` exige que la cible
// native `test` du produit exécute au moins un test. La coque avec session
// retire `access.guard.spec.ts` ; ce test prouve sa garde sans session.
export function renderExternalSessionGuardSpec() {
    return `import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { applicationSessionGuard } from './session.guard';
import { ApplicationSession, SESSION_CONFIGURATION } from './session.store';

function decide(pageId: unknown): unknown {
    const route = { data: { page_id: pageId } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => applicationSessionGuard(route, {} as RouterStateSnapshot));
}

describe('applicationSessionGuard sans session', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    it('laisse ouvertes les pages publiques déclarées', () => {
        for (const route of SESSION_CONFIGURATION.routes.filter((entry) => entry.access.mode === 'public')) {
            expect(decide(route.page_id)).toBe(true);
        }
    });

    it('redirige chaque page non publique et toute donnée de route inconnue vers la reconnexion', () => {
        const session = TestBed.inject(ApplicationSession);
        const router = TestBed.inject(Router);
        const reconnect = session.path(SESSION_CONFIGURATION.reconnect_page_id);
        expect(session.connected()).toBe(false);
        const guarded = SESSION_CONFIGURATION.routes.filter((entry) => entry.access.mode !== 'public');
        expect(guarded.length).toBeGreaterThan(0);
        for (const pageId of [...guarded.map((entry) => entry.page_id), undefined, 'page-absente']) {
            const decision = decide(pageId);
            expect(decision).toBeInstanceOf(UrlTree);
            expect(router.serializeUrl(decision as UrlTree)).toBe(reconnect);
        }
    });
});
`;
}

export async function renderAngularApplicationSession({ design, experience }) {
    const config = sessionRenderConfiguration(design, experience);
    const support = await renderSessionHostSupport();
    return {
        ...Object.fromEntries(
            Object.entries(support).map(([path, content]) => [
                'src/app/session/' + path,
                content,
            ])
        ),
        'src/app/session/session.types.ts': sessionTypes(),
        'src/app/session/session.projection.ts': renderSessionProjection(),
        'src/app/session/session.store.ts': sessionStore(config),
        'src/app/session/session.interceptor.ts': sessionHttp(),
        'src/app/session/session.guard.ts': sessionGuard(),
        'src/app/session/session-menu.ts': navigationComponent(),
        'src/app/session/service-endpoints.ts':
            renderSessionEndpointTokens(config),
        'src/app/app.ts': sessionApp(design),
        'src/app/app.routes.ts': sessionRoutes(config),
        'src/app/app.config.ts': `import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { ApplicationSession } from './session/session.store';
import { APPLICATION_SESSION } from './session/session.types';
import { applicationSessionInterceptor } from './session/session.interceptor';

export const appConfig: ApplicationConfig = { providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptors([applicationSessionInterceptor])), provideRouter(appRoutes), { provide: APPLICATION_SESSION, useExisting: ApplicationSession }] };
`,
        'public/sw.js': sessionWorker(),
        'src/app/session/index.ts':
            support['index.ts'] +
            "export * from './session.store';\nexport * from './session.projection';\nexport * from './service-endpoints';\n",
    };
}
