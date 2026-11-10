// X4 : réalisation de la page Connexion des produits fictifs, écrite par
// l'agent développeur (IA) comme le ferait un réalisateur sous bon de travail.
// Le contrat fournit les textes et identifiants ; l'apparence est libre. La
// page monte la composition publiée et ne fait aucun appel réseau direct.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const html = (text) =>
    String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
const literal = (text) => JSON.stringify(String(text));

function component(page, composition) {
    const states = Object.fromEntries(
        page.states.map((state) => [state.kind, state])
    );
    const [action] = page.actions.filter((entry) => entry.kind === 'backend');
    return `import {
    ChangeDetectionStrategy,
    Component,
    Injector,
    computed,
    inject,
    signal,
} from '@angular/core';

import {
    PAGE_COMPOSITION_PROVIDERS,
    PageComposition,
} from '${composition}';

export type PageState = ${page.states.map((state) => literal(state.id)).join(' | ')} | 'submitting';

const ANNOUNCEMENTS: Readonly<Record<PageState, string>> = {
${page.states.map((state) => `    ${literal(state.id)}: ${literal(state.announcement)},`).join('\n')}
    submitting: '',
};

// La composition est créée au premier envoi : sans adresse de service, la page
// s'affiche et l'envoi passe à l'état d'erreur, sans requête.
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-page-${page.id.slice(-8)}',
    templateUrl: './page.component.html',
    styleUrl: './page.component.scss',
    providers: [...PAGE_COMPOSITION_PROVIDERS],
    host: {
        '(window:online)': 'online.set(true)',
        '(window:offline)': 'online.set(false)',
    },
})
export class PageComponent {
    private readonly injector = inject(Injector);
    protected readonly online = signal(
        typeof navigator === 'undefined' ? true : navigator.onLine
    );
    private readonly outcome = signal<PageState>(${literal(states.ready.id)});
    protected readonly state = computed<PageState>(() =>
        this.online() ? this.outcome() : ${literal(states.offline.id)}
    );
    protected readonly announcement = computed(
        () => ANNOUNCEMENTS[this.state()]
    );
    protected readonly values = signal<Readonly<Record<string, string>>>({});
    protected readonly fieldErrors = signal<
        Readonly<Record<string, readonly string[]>>
    >({});

    protected edit(control: string, event: Event): void {
        const target = event.target;
        const value = target instanceof HTMLInputElement ? target.value : '';
        this.values.update((current) => ({ ...current, [control]: value }));
        if (this.outcome() === ${literal(states.error.id)})
            this.outcome.set(${literal(states.ready.id)});
    }

    protected submit(event: Event): void {
        event.preventDefault();
        if (this.state() !== ${literal(action.available_in_state_ids[0])}) return;
        let composition: PageComposition;
        try {
            composition = this.injector.get(PageComposition);
        } catch {
            this.outcome.set(${literal(action.error_state_id)});
            return;
        }
        this.outcome.set('submitting');
        const values = this.values();
        composition.${action.id}
            .submit({
${action.input_bindings.map((binding) => `                ${binding.target_name}: values[${literal(binding.control_id)}] ?? '',`).join('\n')}
            })
            .subscribe({
                next: () => this.outcome.set(${literal(action.success_state_id)}),
                error: () => {
                    this.fieldErrors.set(composition.${action.id}.fieldErrors());
                    this.outcome.set(${literal(action.error_state_id)});
                },
            });
    }
}
`;
}

function template(page) {
    const [region] = page.regions;
    const heading = region.elements.find(
        (element) => element.kind === 'heading'
    );
    const form = region.elements.find((element) => element.kind === 'form');
    const [action] = page.actions.filter((entry) => entry.kind === 'backend');
    const controls = page.controls.map(
        (control) => `        <div class="field">
            <label for="${control.id}-input">${html(control.label)}</label>
            <input
                id="${control.id}-input"
                data-cmz-id="${control.id}"
                name="${control.id}"
                type="${control.kind === 'password' ? 'password' : 'text'}"
                autocomplete="${control.kind === 'password' ? 'current-password' : 'username'}"
                ${control.required ? 'required' : ''}
                [attr.aria-invalid]="fieldErrors()['${control.id}'] ? true : null"
                (input)="edit('${control.id}', $event)"
            />
            @for (message of fieldErrors()['${control.id}'] ?? []; track $index) {
                <p class="field-error">{{ message }}</p>
            }
        </div>`
    );
    const states = page.states.map(
        (state) => `        @case (${literal(state.id).replaceAll('"', "'")}) {
            <p data-cmz-id="${state.id}" class="state state-${state.kind}">${html(state.description)}</p>
        }`
    );
    return `<main data-cmz-id="${region.id}" aria-label="${html(region.accessible_name)}" class="page">
    <h1 data-cmz-id="${heading.id}">${html(heading.content)}</h1>
    <p class="visually-hidden" role="status" aria-live="polite">{{ announcement() }}</p>
    <div class="status">
        @switch (state()) {
${states.join('\n')}
        }
    </div>
    <form data-cmz-id="${form.id}" aria-label="${html(form.accessible_name)}" (submit)="submit($event)">
${controls.join('\n')}
        <button data-cmz-id="${action.id}" type="submit" [disabled]="state() !== '${action.available_in_state_ids[0]}'">
            ${html(action.label)}
        </button>
    </form>
</main>
`;
}

function styles() {
    return `:host {
    display: block;
    padding: 2rem 1rem;
}

.page {
    max-width: 28rem;
    margin: 0 auto;
    display: grid;
    gap: 1.25rem;
}

form {
    display: grid;
    gap: 1rem;
}

.field {
    display: grid;
    gap: 0.25rem;
}

input {
    font: inherit;
    padding: 0.5rem 0.75rem;
    border: 1px solid #5f6b66;
    border-radius: 0.375rem;
}

input:focus-visible,
button:focus-visible {
    outline: 3px solid #0b5d3b;
    outline-offset: 2px;
}

button {
    font: inherit;
    padding: 0.625rem 1rem;
    border: 0;
    border-radius: 0.375rem;
    background: #0b5d3b;
    color: #fff;
    cursor: pointer;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.state-error,
.field-error {
    color: #a1260d;
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
`;
}

function spec(page, composition) {
    const states = Object.fromEntries(
        page.states.map((state) => [state.kind, state])
    );
    const [action] = page.actions.filter((entry) => entry.kind === 'backend');
    const controls = page.controls.map((control) => control.id);
    return `import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageComposition } from '${composition}';
import { PageComponent } from './page.component';

function render(composition: () => unknown): ComponentFixture<PageComponent> {
    TestBed.overrideComponent(PageComponent, {
        set: { providers: [{ provide: PageComposition, useFactory: composition }] },
    });
    const fixture = TestBed.createComponent(PageComponent);
    fixture.detectChanges();
    return fixture;
}

function type(fixture: ComponentFixture<PageComponent>, id: string, value: string): void {
    const input = fixture.nativeElement.querySelector(\`[data-cmz-id="\${id}"]\`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
}

function send(fixture: ComponentFixture<PageComponent>): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit', { cancelable: true })
    );
    fixture.detectChanges();
}

const visible = (fixture: ComponentFixture<PageComponent>, id: string): boolean =>
    fixture.nativeElement.querySelector(\`[data-cmz-id="\${id}"]\`) !== null;

describe('Page ${page.id}', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche le titre, les champs étiquetés et l’état initial', () => {
        const fixture = render(() => ({}));
        const root = fixture.nativeElement as HTMLElement;
        expect(root.querySelector('h1')?.textContent?.trim()).toBe(${literal(page.title)});
        for (const id of ${JSON.stringify(controls)}) {
            const input = root.querySelector(\`[data-cmz-id="\${id}"]\`) as HTMLInputElement;
            expect(root.querySelector(\`label[for="\${input.id}"]\`)).not.toBeNull();
            expect(input.required).toBe(true);
        }
        expect(visible(fixture, ${literal(states.ready.id)})).toBe(true);
    });

    it('envoie les valeurs saisies par la composition et passe à l’état de succès', () => {
        const result = new Subject<void>();
        const submit = vi.fn(() => result.asObservable());
        const fixture = render(() => ({
            ${action.id}: { submit, fieldErrors: signal({}) },
        }));
${action.input_bindings.map((binding) => `        type(fixture, ${literal(binding.control_id)}, 'valeur-${binding.control_id}');`).join('\n')}
        send(fixture);
        expect(submit).toHaveBeenCalledWith({
${action.input_bindings.map((binding) => `            ${binding.target_name}: 'valeur-${binding.control_id}',`).join('\n')}
        });
        result.next();
        result.complete();
        fixture.detectChanges();
        expect(visible(fixture, ${literal(action.success_state_id)})).toBe(true);
    });

    it('montre l’erreur et les erreurs de champ quand la commande échoue', () => {
        const result = new Subject<void>();
        const fixture = render(() => ({
            ${action.id}: {
                submit: () => result.asObservable(),
                fieldErrors: signal({ ${literal(controls[0])}: ['Valeur refusée.'] }),
            },
        }));
        send(fixture);
        result.error(new Error('refus'));
        fixture.detectChanges();
        expect(visible(fixture, ${literal(action.error_state_id)})).toBe(true);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Valeur refusée.');
    });

    it('sans adresse de service, passe à l’état d’erreur sans rien envoyer', () => {
        const fixture = render(() => {
            throw new Error('SESSION_ENDPOINT');
        });
        send(fixture);
        expect(visible(fixture, ${literal(action.error_state_id)})).toBe(true);
    });

    it('signale la perte du réseau et bloque l’envoi', () => {
        const submit = vi.fn();
        const fixture = render(() => ({ ${action.id}: { submit, fieldErrors: signal({}) } }));
        window.dispatchEvent(new Event('offline'));
        fixture.detectChanges();
        expect(visible(fixture, ${literal(states.offline.id)})).toBe(true);
        send(fixture);
        expect(submit).not.toHaveBeenCalled();
        window.dispatchEvent(new Event('online'));
        fixture.detectChanges();
        expect(visible(fixture, ${literal(states.ready.id)})).toBe(true);
    });
});
`;
}

function evidence(page, contractSha256) {
    const map = (ids) =>
        ids.map((id) => ({ id, selector: `[data-cmz-id="${id}"]` }));
    return {
        schema_version: '1.0.0',
        kind: 'page-realization-evidence',
        page_id: page.id,
        page_contract_sha256: contractSha256,
        states: map(page.states.map((entry) => entry.id)),
        controls: map(page.controls.map((entry) => entry.id)),
        actions: map(page.actions.map((entry) => entry.id)),
        data_bindings: map(page.data_bindings.map((entry) => entry.id)),
        regions: map(page.regions.map((entry) => entry.id)),
        elements: map(
            page.regions.flatMap((region) =>
                region.elements.map((entry) => entry.id)
            )
        ),
    };
}

// Fichiers de la réalisation, écrits dans le brouillon du produit indiqué par
// le bon de travail ; `composition` est le module que la page doit monter.
export function connexionRealizationFiles({
    pageContract,
    contractSha256,
    composition,
}) {
    const { page } = pageContract;
    return {
        'page.component.html': template(page),
        'page.component.scss': styles(),
        'page.component.spec.ts': spec(page, composition),
        'page.component.ts': component(page, composition),
        'realization-evidence.json':
            JSON.stringify(evidence(page, contractSha256), null, 2) + '\n',
    };
}

export async function writeConnexionRealization(root, draftRoot, files) {
    for (const [name, content] of Object.entries(files)) {
        const path = join(root, draftRoot, name);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content);
    }
}
