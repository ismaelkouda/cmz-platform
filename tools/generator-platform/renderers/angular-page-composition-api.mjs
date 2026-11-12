// X4-sécurité-3, O-A : table `api` de la composition extérieure, source unique
// de ses membres publiés (G-A1), et assertion de type générée (G-A5).
// Profil extérieur seulement : le profil interne n'a ni table ni assertion.
import { camelCase } from './shared.mjs';

// Genres publiés. `read` reste réservé et non ajouté (X5, D-X5-3, R1) : une
// lecture se publie avec les genres existants, `signal` et `command`.
export const COMPOSITION_API_KINDS = Object.freeze([
    'command',
    'constant',
    'signal',
]);

// Patron fermé des membres d'un nœud de commande, avec leur genre.
export const COMMAND_MEMBER_KINDS = Object.freeze({
    authorized: 'signal',
    deniedBehavior: 'constant',
    error: 'signal',
    fieldErrors: 'signal',
    result: 'signal',
    state: 'signal',
    submit: 'command',
});

// X5 C4 (D-X5-3, R1) : patron fermé des six membres d'un nœud de lecture.
// `load` et `reload` sont des commandes FROIDES : l'Observable veut dire
// « intention acceptée », pas « lecture terminée ».
export const QUERY_MEMBER_KINDS = Object.freeze({
    error: 'signal',
    items: 'signal',
    load: 'command',
    pagination: 'signal',
    reload: 'command',
    state: 'signal',
});

function fail(message) {
    throw new Error(`angular page composition api: ${message}`);
}

const MEMBER = /^[a-z][A-Za-z0-9]*$/;

export const ABSENT_TEXT_ROOT = 'absentText';

// Liaisons du plan qui portent un texte d'absence, triées par identifiant.
export function absentTextBindings(plan) {
    return (plan.output_bindings ?? [])
        .filter((binding) => Object.hasOwn(binding, 'absent_text'))
        .sort((left, right) =>
            left.id < right.id ? -1 : left.id > right.id ? 1 : 0
        );
}

// Table `api` d'un plan de page extérieur : `online`, puis les membres de
// chaque nœud de lecture et de commande, triés par chemin. Profil de session
// seulement (G1).
export function externalCompositionApi(plan) {
    if (plan?.schema_version !== '1.1.0')
        fail('external composition supports session pages only');
    // X5 C5 (Fable, revue de C4) : refus NOMMÉ, à la génération, d'une page
    // qui mêle des lectures et des commandes à permissions. La spec des
    // lectures ne fournit pas le port de permissions : le cas reste fermé tant
    // qu'il n'est pas réellement pris en charge.
    if (
        plan.query_nodes?.length &&
        plan.command_nodes.some(
            (node) => node.authorization.mode === 'required'
        )
    )
        fail(
            'PAGE_MIXED_READ_PERMISSION: a page with reads and permission-gated commands is not supported yet'
        );
    const entries = [{ path: 'online', kind: 'signal' }];
    // `absentText` est une racine RÉSERVÉE (X5 C5, B+, C-B+1) : un nœud dont
    // le nom vaudrait `absentText` entrerait en collision avec elle.
    const names = new Set(['online', ABSENT_TEXT_ROOT]);
    for (const [nodes, kinds] of [
        [plan.query_nodes ?? [], QUERY_MEMBER_KINDS],
        [plan.command_nodes, COMMAND_MEMBER_KINDS],
    ])
        for (const node of nodes) {
            const name = camelCase(node.id);
            if (!MEMBER.test(name) || names.has(name))
                fail(`unsafe or duplicate member ${node.id}`);
            names.add(name);
            for (const [member, kind] of Object.entries(kinds))
                entries.push({ path: `${name}.${member}`, kind });
        }
    // X5 C5 (B+) : un texte d'absence par liaison qui en déclare un, publié en
    // constante. La valeur vient du plan scellé, jamais du bon de travail.
    const liaisons = new Set();
    for (const binding of absentTextBindings(plan)) {
        const name = camelCase(binding.id);
        if (!MEMBER.test(name) || liaisons.has(name))
            fail(`unsafe or duplicate absent text binding ${binding.id}`);
        liaisons.add(name);
        entries.push({ path: `${ABSENT_TEXT_ROOT}.${name}`, kind: 'constant' });
    }
    return Object.freeze(
        entries
            .sort((left, right) =>
                left.path < right.path ? -1 : left.path > right.path ? 1 : 0
            )
            .map((entry) => Object.freeze(entry))
    );
}

// X5 C5 (B+, C-B+1) : rendu de la racine `absentText`, sans nœud. Chaque
// valeur, bornée à la liste blanche, devient un littéral inerte
// (`JSON.stringify`) ; elle vient du plan scellé.
export function renderAbsentTextRoot(api, plan) {
    const values = new Map(
        absentTextBindings(plan).map((binding) => [
            camelCase(binding.id),
            binding.absent_text,
        ])
    );
    const members = nodeMembers(api, ABSENT_TEXT_ROOT).map(
        ({ member, kind }) => {
            if (kind !== 'constant' || !values.has(member))
                fail(`absent text ${member} has no plan binding`);
            return `        ${member}: ${JSON.stringify(values.get(member))},`;
        }
    );
    return `    readonly ${ABSENT_TEXT_ROOT} = Object.freeze({
${members.join('\n')}
    });`;
}

// Membres d'un nœud, dans l'ordre de la table.
export function nodeMembers(api, name) {
    return api
        .filter((entry) => entry.path.startsWith(`${name}.`))
        .map((entry) => ({
            member: entry.path.slice(name.length + 1),
            kind: entry.kind,
        }));
}

// G-A5 : la composition satisfait exactement la table, genre par genre. Le
// typage vérifie ici un générateur, pas un adversaire : il est compilé en mode
// strict par l'oracle du produit.
export function renderCompositionApiAssertion(api) {
    const roots = [...new Set(api.map((entry) => entry.path.split('.')[0]))];
    const union = (values) =>
        values.length === 0
            ? 'never'
            : values.map((value) => JSON.stringify(value)).join(' | ');
    const access = (path) =>
        `PageComposition${path
            .split('.')
            .map((part) => `[${JSON.stringify(part)}]`)
            .join('')}`;
    const check = {
        signal: 'IsDataSignal',
        constant: 'IsData',
        command: 'IsCommand',
    };
    const assertions = [
        `PageCompositionExact<keyof PageComposition, ${union(roots)}>`,
        ...roots
            .filter((root) =>
                api.some((entry) => entry.path.startsWith(`${root}.`))
            )
            .map(
                (root) =>
                    `PageCompositionExact<keyof ${access(root)}, ${union(
                        nodeMembers(api, root).map(({ member }) => member)
                    )}>`
            ),
        ...api.map((entry) => `${check[entry.kind]}<${access(entry.path)}>`),
    ];
    return `import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

import type { PageComposition } from './page-composition';

export const PAGE_COMPOSITION_API = ${JSON.stringify(api)} as const;

type PageDataPrimitive = null | undefined | void | boolean | number | string;
type IsData<T, Seen = never> = [T] extends [PageDataPrimitive]
    ? true
    : [T] extends [Seen]
      ? true
      : T extends PageDataPrimitive
        ? true
        : T extends (...args: never[]) => unknown
          ? false
          : T extends readonly (infer Item)[]
            ? IsData<Item, Seen | T>
            : T extends object
              ? false extends { [Key in keyof T]-?: Key extends string ? IsData<T[Key], Seen | T> : false }[keyof T]
                  ? false
                  : true
              : false;
type IsDataSignal<T> = T extends Signal<infer Value>
    ? 'set' extends keyof T
        ? false
        : 'update' extends keyof T
          ? false
          : IsData<Value>
    : false;
type IsCommand<T> = T extends (input: infer Input) => Observable<infer Output>
    ? 'subscribe' extends keyof T
        ? false
        : [IsData<Input>, IsData<Output>] extends [true, true]
          ? true
          : false
    : false;
type PageCompositionExact<Left, Right> = [Left] extends [Right]
    ? [Right] extends [Left]
        ? true
        : false
    : false;
type PageCompositionAssert<T extends true> = T;

export type PageCompositionApiProof = [
${assertions.map((assertion) => `    PageCompositionAssert<${assertion}>,`).join('\n')}
];
`;
}

// Entrée d'exemple valide d'une commande : chaînes non vides, format courriel
// et bornes de longueur déclarées (seules contraintes du validateur rendu).
export function sampleCommandInput(model) {
    const [action] = model.actions;
    if (action.port.input.kind === 'none') return {};
    return Object.fromEntries(
        action.port.input.fields.map((field) => {
            const email = field.validations.some(
                (validation) =>
                    validation.kind === 'format' &&
                    validation.format === 'email'
            );
            let value = email ? 'cmz@exemple.test' : 'cmz-contrat';
            const min = field.constraints?.min_length ?? 0;
            const max = field.constraints?.max_length;
            while (value.length < min) value += 'x';
            if (max !== undefined && value.length > max)
                value = email ? value : value.slice(0, Math.max(1, max));
            return [field.name, value];
        })
    );
}

// P-A3 : spec de contrat générée et scellée, exécutée par `<app>:test`. Le
// serveur et la session sont simulés ; le routeur est espionné.
export function renderCompositionContractSpec(descriptors, hostBindings) {
    const tokens = [
        ...new Set(descriptors.map((descriptor) => descriptor.serviceToken)),
    ].sort();
    const sources = descriptors
        .map(
            ({ sourceName, sourceAlias, node, module }) =>
                `import { ${sourceName} as ${sourceAlias} } from '${module}/${node.primitive_ref.operation_id}.source';`
        )
        .join('\n');
    const commands = descriptors
        .map(
            ({ propertyName, sourceAlias, sampleInput, effect }) =>
                `    { name: ${JSON.stringify(propertyName)}, source: ${sourceAlias}, input: ${JSON.stringify(sampleInput)}, effect: ${effect ? 'true' : 'false'} },`
        )
        .join('\n');
    return `import { HttpBackend, HttpErrorResponse, HttpResponse, provideHttpClient, type HttpEvent, type HttpRequest } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NEVER, Subject, config, defer, of, type Observable } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ${['APPLICATION_SESSION', 'SESSION_CONFIGURATION', ...tokens].join(', ')} } from '${hostBindings.session.module}';
${sources}
import { PageComposition } from './page-composition';
import { PAGE_COMPOSITION_API } from './page-composition.api';
import { PAGE_COMPOSITION_PROVIDERS } from './page-composition.providers';

const ROUTES: readonly string[] = SESSION_CONFIGURATION.routes.map((route) => route.path);
const TOKENS = [${tokens.join(', ')}];
const COMMANDS = [
${commands}
] as const;
type Command = (typeof COMMANDS)[number];
type Submit = (input: unknown) => Observable<unknown>;

function isData(value: unknown, seen: Set<unknown> = new Set()): boolean {
    if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'string') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    if (!Object.isFrozen(value)) return false;
    if (Array.isArray(value)) return value.every((item) => isData(item, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(value).every((key) => {
        const entry = Object.getOwnPropertyDescriptor(value, key);
        return typeof key === 'string' && entry !== undefined && Object.hasOwn(entry, 'value') && isData(entry.value, seen);
    });
}

// Serveur simulé : chaque requête reste en attente jusqu'à sa réponse.
class ContractBackend implements HttpBackend {
    readonly pending: { readonly request: HttpRequest<unknown>; readonly events: Subject<HttpEvent<unknown>> }[] = [];
    handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
        const events = new Subject<HttpEvent<unknown>>();
        this.pending.push({ request, events });
        return events.asObservable();
    }
    respond(status: number, body: unknown): void {
        const [{ request, events }] = this.pending.splice(0, 1);
        if (status >= 200 && status < 300) {
            events.next(new HttpResponse({ body, status, statusText: String(status), url: request.url }));
            events.complete();
        } else events.error(new HttpErrorResponse({ error: body, status, statusText: String(status), url: request.url }));
    }
    unreachable(): void {
        const [{ request, events }] = this.pending.splice(0, 1);
        events.error(new HttpErrorResponse({ error: new ProgressEvent('error'), status: 0, url: request.url }));
    }
}

function setup(options: { readonly address?: boolean; readonly command?: Command; readonly execute?: () => Observable<unknown> } = {}) {
    const epoch = signal(0);
    const backend = new ContractBackend();
    const session = {
        epoch: () => epoch(),
        connected: () => false,
        establish: () => ROUTES[0],
        complete: () => ROUTES[ROUTES.length - 1],
    };
    const navigateByUrl = vi.fn<(url: string, extras?: unknown) => Promise<boolean>>(() => Promise.resolve(true));
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(),
            { provide: HttpBackend, useValue: backend },
            { provide: APPLICATION_SESSION, useValue: session },
            { provide: Router, useValue: { navigateByUrl } },
            ...TOKENS.map((token) => ({
                provide: token,
                useFactory: (): string => {
                    if (options.address === false) throw new Error('SESSION_ENDPOINT');
                    return '/api/contrat';
                },
            })),
            ...PAGE_COMPOSITION_PROVIDERS,
        ],
    });
    const execute = options.execute;
    if (options.command && execute) TestBed.overrideProvider(options.command.source, { useValue: { execute: vi.fn(() => execute()) } });
    const composition = TestBed.inject(PageComposition);
    const at = (path: string): unknown =>
        path.split('.').reduce<unknown>((value, key) => (value as Readonly<Record<string, unknown>>)[key], composition);
    return { composition, backend, navigateByUrl, at, bump: () => epoch.update((value) => value + 1) };
}

type Context = ReturnType<typeof setup>;

function submit(context: Context, command: Command) {
    const call = context.at(command.name + '.submit') as Submit;
    let observable: Observable<unknown> | undefined;
    expect(() => {
        observable = call(command.input);
    }).not.toThrow();
    expect(context.backend.pending).toEqual([]);
    const values: unknown[] = [];
    const outcome: { failure?: unknown; complete: boolean } = { complete: false };
    expect(() =>
        observable?.subscribe({
            next: (value) => values.push(value),
            error: (failure: unknown) => (outcome.failure = failure),
            complete: () => (outcome.complete = true),
        })
    ).not.toThrow();
    return { values, outcome };
}

function expectContract(context: Context, values: readonly unknown[]): void {
    for (const entry of PAGE_COMPOSITION_API) {
        if (entry.kind === 'command') {
            expect(typeof context.at(entry.path)).toBe('function');
            continue;
        }
        const member = context.at(entry.path);
        let value: unknown;
        expect(() => {
            value = entry.kind === 'signal' ? (member as () => unknown)() : member;
        }).not.toThrow();
        expect(isData(value), entry.path).toBe(true);
    }
    for (const value of values) expect(isData(value)).toBe(true);
    for (const [url, extras] of context.navigateByUrl.mock.calls) {
        expect(ROUTES).toContain(url);
        expect(extras).toEqual({ replaceUrl: true });
    }
}

function expectFailure(outcome: { failure?: unknown; complete: boolean }): void {
    expect(outcome.failure).toBeInstanceOf(Error);
    expect(outcome.complete).toBe(false);
}

const RESULT = Object.freeze(Object.create(null) as Record<string, never>);

describe('PageComposition : contrat de capacité (O-A)', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('garde la gestion asynchrone des erreurs de rxjs', () => {
        expect(config.useDeprecatedSynchronousErrorHandling).toBe(false);
    });

    it('expose exactement la table api, en Données lisibles', () => {
        const context = setup();
        const published = PAGE_COMPOSITION_API.map((entry) => entry.path.split('.')[0]);
        expect(Object.keys(context.composition).filter((key) => !key.startsWith('_') && published.includes(key)).sort()).toEqual([...new Set(published)].sort());
        expectContract(context, []);
    });

    for (const command of COMMANDS) {
        it(command.name + ' : adresse de service absente, erreur sans requête', () => {
            const context = setup({ address: false });
            const { values, outcome } = submit(context, command);
            expect(context.backend.pending).toEqual([]);
            expectFailure(outcome);
            expect(context.navigateByUrl).not.toHaveBeenCalled();
            expectContract(context, values);
        });

        for (const [label, status, body] of [
            ['réponse 4xx', 400, {}],
            ['réponse 5xx', 500, {}],
            ['réponse invalide', 200, 'pas un objet'],
        ] as const) {
            it(command.name + ' : ' + label + ', erreur sans navigation', () => {
                const context = setup();
                const { values, outcome } = submit(context, command);
                expect(context.backend.pending.length).toBe(1);
                context.backend.respond(status, body);
                expectFailure(outcome);
                expect(context.navigateByUrl).not.toHaveBeenCalled();
                expectContract(context, values);
            });
        }

        it(command.name + ' : serveur injoignable, erreur sans navigation', () => {
            const context = setup();
            const { values, outcome } = submit(context, command);
            expect(context.backend.pending.length).toBe(1);
            context.backend.unreachable();
            expectFailure(outcome);
            expect(context.navigateByUrl).not.toHaveBeenCalled();
            expectContract(context, values);
        });

        it(command.name + ' : succès, au plus une navigation vers une route déclarée', () => {
            const context = setup({ command, execute: () => of(RESULT) });
            const { values, outcome } = submit(context, command);
            expect(outcome.failure).toBeUndefined();
            expect(outcome.complete).toBe(true);
            expect(context.navigateByUrl.mock.calls.length).toBe(command.effect ? 1 : 0);
            expectContract(context, values);
        });

        it(command.name + ' : session changée pendant l’envoi, erreur sans navigation', () => {
            const context = setup({
                command,
                execute: () =>
                    defer(() => {
                        context.bump();
                        return of(RESULT);
                    }),
            });
            const { values, outcome } = submit(context, command);
            expectFailure(outcome);
            expect(context.navigateByUrl).not.toHaveBeenCalled();
            expectContract(context, values);
        });

        it(command.name + ' : requête déjà en cours, erreur sans levée synchrone', () => {
            const context = setup({ command, execute: () => NEVER });
            submit(context, command);
            const { values, outcome } = submit(context, command);
            expectFailure(outcome);
            expectContract(context, values);
        });
    }
});
`;
}
