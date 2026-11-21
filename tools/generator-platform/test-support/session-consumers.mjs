// Consommateurs de fixture des tests de pile (sortis de prepare-stack-tests.mjs
// pour être testés : défaut CI de 9ecb7df9, `load()` sans entrée).
import { pascalCase } from '../renderers/shared.mjs';

// Entrée de `load` comme la façade la déclare : la lecture est résolue comme
// en production (external-page-composition.mjs, `primitive_ref.operation_id`)
// et attend une entrée exactement quand `port.input.kind === 'object'`.
// Fermé : un nœud ou une lecture introuvable refuse la préparation.
export function loadInput(data, plan, loadId) {
    const node = plan.query_nodes.find((entry) => entry.id === loadId);
    const query = data.queryModel.queries.find(
        (candidate) => candidate.id === node?.primitive_ref.operation_id
    );
    if (!query)
        throw new Error(`fixture consumer: page load ${loadId} has no read`);
    return query.port.input.kind === 'object' ? '{}' : '';
}

// Forme de la lecture catalogue, publiée au runtime de test pour les specs de
// pile (même source : le modèle de lecture compilé). `page` : nom du champ des
// lignes et des champs de page, ou null pour une liste.
export function catalogueRead(data) {
    const [query, ...others] = data.queryModel.queries;
    if (!query || others.length > 0)
        throw new Error('fixture consumer: exactly one catalogue read');
    const { result } = query.transport;
    return {
        input: query.port.input.kind === 'object',
        page:
            result.kind === 'page'
                ? {
                      items: result.items_field,
                      currentPage: result.page_fields.currentPage.source_field,
                      lastPage: result.page_fields.lastPage.source_field,
                      pageSize: result.page_fields.pageSize.source_field,
                      totalItems: result.page_fields.totalItems.source_field,
                  }
                : null,
    };
}

// Fixture consumers mount the produced page composition in the produced
// shell. They are test applications, not generated business-page claims.
export function sessionConsumers(data) {
    const imports = [
        "import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';",
        "import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';",
        "import type { Routes } from '@angular/router';",
        "import { appRoutes } from './src/app/app.routes';",
    ];
    const components = [],
        entries = [];
    for (const [id, { page, plan }] of data.pages) {
        if (!plan) continue;
        const name = pascalCase(page.path.slice(1)) + 'Consumer';
        const root = `./src/app/pages/${id}/execution`;
        imports.push(
            `import { PageComposition as ${name}Composition } from '${root}/page-composition';`
        );
        imports.push(
            `import { PAGE_COMPOSITION_PROVIDERS as ${name}Providers } from '${root}/page-composition.providers';`
        );
        const action = page.actions.find((entry) => entry.kind === 'backend');
        if (action) {
            const fields = data.actions.get(action.operation_ref.operation_id)
                .definition.operations[0].input.fields;
            const names = fields.map((field) => field.name);
            components.push(`@Component({ selector: 'app-fixture-${page.path.slice(1)}', changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule], providers: [...${name}Providers],
    template: \`<h1>${page.path.slice(1)}</h1><form [formGroup]="form" (ngSubmit)="submit()">
        @for (field of fields; track field) { <label>{{ field }}<input [attr.name]="field" [formControl]="form.controls[field]" [attr.aria-describedby]="field + '-error'"></label>
            <p [id]="field + '-error'">@for (message of command.fieldErrors()[field] ?? []; track $index) { {{ message }} }</p> }
        <button type="submit" [disabled]="command.state() === 'submitting'">Envoyer</button>
        @if (command.error(); as error) { <p role="alert">{{ error.message }}</p> }
        <p role="status">{{ command.state() }}</p></form>\` })
export class ${name} {
    readonly command = inject(${name}Composition).${action.id};
    readonly fields: readonly string[] = ${JSON.stringify(names)};
    readonly form = new FormGroup<Record<string, FormControl<string>>>(Object.fromEntries(this.fields.map((name) => [name, new FormControl('', { nonNullable: true })])));
    readonly outcome = signal('idle');
    submit(): void { this.command.submit({ ${names.map((field) => `${JSON.stringify(field)}: this.form.controls[${JSON.stringify(field)}].value`).join(', ')} }).subscribe({ next: () => this.outcome.set('success'), error: () => this.outcome.set('error') }); }
}`);
        } else {
            const load = page.loads[0].id;
            const input = loadInput(data, plan, load);
            components.push(`@Component({ selector: 'app-fixture-catalogue', changeDetection: ChangeDetectionStrategy.OnPush, providers: [...${name}Providers], template: \`<h1>Catalogue</h1><ul>@for (item of page.${load}.items(); track item.id) { <li>{{ item.label }}</li> }</ul>\` })
export class ${name} { readonly page = inject(${name}Composition); constructor() { this.page.${load}.load(${input}); } }`);
        }
        entries.push(`${JSON.stringify(id)}: ${name}`);
    }
    return (
        imports.join('\n') +
        '\n' +
        components.join('\n') +
        `
const consumers = { ${entries.join(', ')} };
export const consumedRoutes: Routes = appRoutes.map((route) => {
    const id = route.data?.['page_id'];
    const consumer = typeof id === 'string' && Object.hasOwn(consumers, id) ? consumers[id as keyof typeof consumers] : undefined;
    return consumer ? { ...route, loadComponent: () => Promise.resolve(consumer) } : route;
});\n`
    );
}
