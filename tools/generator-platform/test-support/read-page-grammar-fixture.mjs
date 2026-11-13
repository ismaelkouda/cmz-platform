// X5 C5b : page à lectures d'un produit fictif (`label` nullable, texte
// d'absence scellé), son bon de travail, et la page réalisée de RÉFÉRENCE,
// acceptée par toute la grammaire. Témoin accepté de chaque refus LE et A.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { pageGrammarFindings } from '../core/page-grammar/index.mjs';
import { formatViolation } from '../core/page-grammar/text.mjs';
import {
    nullableLabel,
    queryPage,
    readWorkOrderOf,
} from './external-query-page.mjs';

export const ABSENT_TEXT = 'Non renseigné';

// `field` : nom du champ de composition (résolu par symbole, pas par nom).
export function readPageFiles(workOrder, { field = 'composition' } = {}) {
    const [read] = workOrder.read_states.reads;
    const { state, items } = read.access;
    const absent = read.bindings[0].absent_access;
    const ts = `import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
    PAGE_COMPOSITION_PROVIDERS,
    PageComposition,
} from '${workOrder.composition.module}';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: '${workOrder.grammar.selector}',
    templateUrl: './page.component.html',
    styleUrl: './page.component.scss',
    providers: [...PAGE_COMPOSITION_PROVIDERS],
})
export class PageComponent {
    private readonly ${field} = inject(PageComposition);
    protected readonly online = computed(() => this.${field}.online());
    protected readonly ${state} = computed(() => this.${field}.${read.member}.state());
    protected readonly ${items} = computed(() => this.${field}.${read.member}.items());
    protected readonly ${absent} = computed(() => this.${field}.absentText.${absent.slice(0, -'Absent'.length)});
}
`;
    const html = `<main data-cmz-id="main" aria-label="Report form" class="page">
    <h1 data-cmz-id="report-heading">Catalogue</h1>
    @if (online() === false) {
        <p class="state">Network access is unavailable.</p>
    } @else {
        @switch (${state}()) {
            @case ('idle') {
                <p class="state">Waiting.</p>
            }
            @case ('loading') {
                <p class="state">Loading.</p>
            }
            @case ('reloading') {
                <p class="state">Refreshing.</p>
            }
            @case ('success') {
                <ul data-cmz-id="catalogue-list" aria-label="Catalogue">
                    @for (row of ${items}(); track $index) {
                        <li>{{ row.id }} {{ row.label ?? ${absent}() }}</li>
                    }
                </ul>
            }
            @case ('empty') {
                <p class="state">No item.</p>
            }
            @case ('error') {
                <p class="state">Loading failed.</p>
            }
        }
    }
</main>
`;
    const scss = `.page {
    max-width: 28rem;
}
`;
    return {
        'page.component.ts': ts,
        'page.component.html': html,
        'page.component.scss': scss,
    };
}

export async function readGrammarFixture(t, domain = 'observatory') {
    const { product, options } = await queryPage(
        t,
        domain,
        nullableLabel(domain, ABSENT_TEXT)
    );
    const { workOrder } = await readWorkOrderOf(options);
    const pageContract = JSON.parse(
        await readFile(join(product.app, workOrder.page_contract.path), 'utf8')
    );
    const findings = (files) =>
        pageGrammarFindings({ files, workOrder, pageContract });
    return {
        product,
        workOrder,
        pageContract,
        reference: readPageFiles(workOrder),
        findings,
        violations: (files) => findings(files).map(formatViolation),
    };
}

// Cas de test : ancres de la page de référence et refus attendu, nommé.
export const H = 'page.component.html';
export const T = 'page.component.ts';
export const CELL = '{{ row.label ?? catalogueRowsAbsent() }}';
export const LI = `<li>{{ row.id }} ${CELL}</li>`;
export const LAST_TS = '    protected readonly catalogueRowsAbsent';
export const ERROR = '<p class="state">Loading failed.</p>';
export const EMPTY = '<p class="state">No item.</p>';

export const swap = (files, name, anchor, text) => {
    assert.equal(files[name].split(anchor).length, 2, anchor);
    return { ...files, [name]: files[name].replace(anchor, text) };
};
const codes = (fixture, files) =>
    fixture.findings(files).map((entry) => `${entry.code} ${entry.message}`);
// Le refus attendu est présent, sous son code et son message.
export const refused = (fixture, files, code, message, label) => {
    const found = codes(fixture, files);
    assert.ok(
        found.some(
            (entry) => entry.startsWith(`${code} `) && message.test(entry)
        ),
        `${label} : ${JSON.stringify(found)}`
    );
};

// O-C5b-3 (Fable) : le refus attendu CHEVAUCHE le texte inséré `needle`
// (premier emplacement, unique), dans le fichier `name`.
export const refusedAt = (
    fixture,
    files,
    needle,
    code,
    message,
    label,
    name = H
) => {
    const start = files[name].indexOf(needle);
    assert.ok(
        start >= 0 && files[name].indexOf(needle, start + 1) < 0,
        `${label} : ancre ${needle}`
    );
    const end = start + needle.length;
    const found = fixture.findings(files);
    assert.ok(
        found.some(
            (entry) =>
                entry.code === code &&
                message.test(`${entry.code} ${entry.message}`) &&
                entry.file === name &&
                entry.start < end &&
                entry.end > start
        ),
        `${label} : ${JSON.stringify(found.map((entry) => [entry.code, entry.start, entry.end, entry.message]))}`
    );
};
