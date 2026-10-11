import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError, type Observable } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageComposition } from '../../generated/page_6666666666666666/angular/src';
import { PageCreateComponent } from './page.create.component';

interface SetupOptions {
    submit?: () => Observable<unknown>;
}

async function setup(options: SetupOptions = {}) {
    const state = signal<'idle' | 'submitting'>('idle');
    const submitUser = vi.fn(
        options.submit ?? (() => of({ message: 'SUCCESS' }))
    );
    TestBed.configureTestingModule({
        imports: [PageCreateComponent],
        providers: [
            {
                provide: PageComposition,
                useValue: { createUser: { state, submit: submitUser } },
            },
        ],
    });
    const fixture = TestBed.createComponent(PageCreateComponent);
    fixture.componentRef.setInput('profiles', [
        { value: 'profile-a', label: 'Profil A' },
        { value: 'profile-b', label: 'Profil B' },
    ]);
    const created = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.created.subscribe(created);
    fixture.componentInstance.closed.subscribe(closed);
    // Le focus n'existe que dans le document.
    document.body.append(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();
    return {
        closed,
        created,
        fixture,
        root: fixture.nativeElement as HTMLElement,
        state,
        submitUser,
    };
}

function element<T extends Element>(root: Element, selector: string): T {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Élément introuvable: ${selector}`);
    return found;
}

function field(root: Element, id: string): HTMLInputElement {
    return element<HTMLInputElement>(root, `[data-cmz-id="${id}"]`);
}

function setControl(control: HTMLInputElement, value: string): void {
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillValidForm(root: HTMLElement): void {
    setControl(field(root, 'first-name'), '  Ada  ');
    setControl(field(root, 'last-name'), '  Lovelace  ');
    setControl(field(root, 'email'), ' ada@example.test ');
    setControl(field(root, 'phone'), ' +225 01 02 03 04 ');
    setControl(field(root, 'profile-id'), 'profile-a');
}

function submitForm(root: HTMLElement): void {
    element<HTMLFormElement>(
        root,
        '[data-cmz-id="create-user-form"]'
    ).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function pressEscape(target: Element): void {
    target.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
}

const FIELD_IDS = ['last-name', 'first-name', 'email', 'phone', 'profile-id'];

afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('PageCreateComponent', () => {
    it('ouvre un dialogue modal vierge et focalise Nom', async () => {
        const { root } = await setup();
        const dialog = element<HTMLElement>(root, '[role="dialog"]');

        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(dialog.getAttribute('aria-labelledby')).toBe('create-title');
        expect(FIELD_IDS.map((id) => field(root, id).value)).toEqual([
            '',
            '',
            '',
            '',
            '',
        ]);
        for (const id of FIELD_IDS)
            expect(field(root, id).getAttribute('aria-invalid')).toBeNull();
        expect(field(root, 'last-name').placeholder).toBe('Saisir le nom');
        expect(field(root, 'email').placeholder).toBe('nom@example.com');
        expect(
            Array.from(
                field(root, 'profile-id').querySelectorAll('option')
            ).map((option) => option.textContent?.trim())
        ).toEqual(['Choisir un profil', 'Profil A', 'Profil B']);
        expect(document.activeElement).toBe(field(root, 'last-name'));
    });

    it('expose les erreurs sans commande et refocalise Nom', async () => {
        const { created, fixture, root, submitUser } = await setup();
        const submit = element<HTMLButtonElement>(
            root,
            '[data-cmz-id="create-user-form"] [type="submit"]'
        );
        setControl(field(root, 'first-name'), '   ');
        setControl(field(root, 'email'), 'adresse-invalide');
        field(root, 'email').focus();
        expect(submit.disabled).toBe(false);
        submit.click();
        await fixture.whenStable();

        expect(submitUser).not.toHaveBeenCalled();
        expect(created).not.toHaveBeenCalled();
        expect(root.textContent).toContain('Le prénom est obligatoire.');
        expect(root.textContent).toContain(
            'Saisissez une adresse email valide.'
        );
        for (const id of FIELD_IDS)
            expect(field(root, id).getAttribute('aria-invalid')).toBe('true');
        expect(document.activeElement).toBe(field(root, 'last-name'));
    });

    it('soumet un payload normalisé et n’émet `created` qu’après la réponse', async () => {
        const response = new Subject<unknown>();
        const { closed, created, fixture, root, submitUser } = await setup({
            submit: () => response,
        });
        fillValidForm(root);
        await fixture.whenStable();
        submitForm(root);
        // La soumission des formulaires signal est asynchrone : la commande
        // part après la validation, la réponse restant ici en suspens.
        await vi.waitFor(() => expect(submitUser).toHaveBeenCalledOnce());

        expect(submitUser).toHaveBeenCalledWith({
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.test',
            phone: '+225 01 02 03 04',
            profileId: 'profile-a',
        });
        expect(created).not.toHaveBeenCalled();

        response.next({ message: 'SUCCESS' });
        response.complete();
        await vi.waitFor(() => expect(created).toHaveBeenCalledOnce());

        expect(closed).not.toHaveBeenCalled();
    });

    it('conserve le brouillon et focalise Email après un conflit', async () => {
        const { created, fixture, root, submitUser } = await setup({
            submit: () => throwError(() => new Error('email existe déjà')),
        });
        fillValidForm(root);
        await fixture.whenStable();
        submitForm(root);
        await fixture.whenStable();

        expect(submitUser).toHaveBeenCalledOnce();
        expect(created).not.toHaveBeenCalled();
        expect(field(root, 'email').value).toContain('ada@example.test');
        expect(root.textContent).toContain('Cette adresse email existe déjà.');
        expect(
            element(root, '[data-cmz-id="create-failed"]').getAttribute('role')
        ).toBe('alert');
        expect(document.activeElement).toBe(field(root, 'email'));

        setControl(field(root, 'email'), 'autre@example.test');
        await fixture.whenStable();
        expect(root.querySelector('[data-cmz-id="create-failed"]')).toBeNull();
        expect(
            element<HTMLButtonElement>(
                root,
                '[data-cmz-id="create-user-form"] [type="submit"]'
            ).disabled
        ).toBe(false);
    });

    it('signale un échec qui ne concerne pas l’adresse sans accuser Email', async () => {
        const { created, fixture, root } = await setup({
            submit: () => throwError(() => new Error('service indisponible')),
        });
        fillValidForm(root);
        await fixture.whenStable();
        submitForm(root);
        await fixture.whenStable();

        expect(created).not.toHaveBeenCalled();
        expect(root.textContent).toContain(
            'Vérifiez les informations puis réessayez.'
        );
        expect(root.textContent).not.toContain(
            'Cette adresse email existe déjà.'
        );
    });

    it('émet `closed` sur Échap quand le brouillon est vide', async () => {
        const { closed, created, fixture, root } = await setup();
        pressEscape(element(root, '[role="dialog"]'));
        await fixture.whenStable();

        expect(closed).toHaveBeenCalledOnce();
        expect(created).not.toHaveBeenCalled();
        expect(root.querySelector('#discard-title')).toBeNull();
    });

    it('demande confirmation avant d’abandonner un brouillon, puis rend le focus ou ferme', async () => {
        const { closed, fixture, root } = await setup();
        const email = field(root, 'email');
        setControl(email, 'brouillon@example.test');
        email.focus();
        pressEscape(element(root, '[role="dialog"]'));
        await fixture.whenStable();

        expect(closed).not.toHaveBeenCalled();
        const confirmation = element<HTMLElement>(root, '.discard-dialog');
        expect(confirmation.getAttribute('aria-modal')).toBe('true');
        expect(confirmation.getAttribute('aria-labelledby')).toBe(
            'discard-title'
        );

        // Échap sur la confirmation reprend la saisie, sans fermer le dialogue.
        pressEscape(confirmation);
        await fixture.whenStable();
        expect(root.querySelector('.discard-dialog')).toBeNull();
        expect(closed).not.toHaveBeenCalled();
        expect(email.value).toBe('brouillon@example.test');
        expect(document.activeElement).toBe(email);

        element<HTMLButtonElement>(root, '.close-button').click();
        await fixture.whenStable();
        const buttons = Array.from(
            root.querySelectorAll<HTMLButtonElement>('.discard-actions button')
        );
        expect(buttons.map((button) => button.textContent?.trim())).toEqual([
            'Continuer la saisie',
            'Abandonner',
        ]);
        buttons[1]?.click();
        await fixture.whenStable();

        expect(closed).toHaveBeenCalledOnce();
    });

    it('verrouille la fermeture et les champs pendant la soumission', async () => {
        const { closed, fixture, root, state } = await setup();
        state.set('submitting');
        await fixture.whenStable();

        for (const id of FIELD_IDS) expect(field(root, id).disabled).toBe(true);
        expect(element<HTMLButtonElement>(root, '.close-button').disabled).toBe(
            true
        );
        expect(
            element(
                root,
                '[data-cmz-id="create-user-form"] [type="submit"]'
            ).textContent?.trim()
        ).toBe('Création…');
        pressEscape(element(root, '[role="dialog"]'));
        await fixture.whenStable();
        expect(closed).not.toHaveBeenCalled();
    });
});
