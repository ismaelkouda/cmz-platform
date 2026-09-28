import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    PAGE_ACTION_PERMISSION_PORT,
    PageComposition,
} from '../../generated/page_6666666666666666/angular/src';
import { APP_ACCESS_DECISION } from '../../access.guard';
import {
    PAGE_COMPACT_MEDIA_QUERY,
    PAGE_EXPANDED_MEDIA_QUERY,
    PAGE_PERMISSION_PROVIDER,
    PageComponent,
} from './page.component';

const USERS = [
    {
        uniqId: 'user-1',
        firstName: 'Test',
        lastName: 'Alpha',
        email: 'alpha@example.invalid',
        phone: '+225 00 00 00 00',
        profile: 'Profil A',
        role: 'supervisor',
        status: 'active',
        updatedAt: '2026-09-26T08:00:00Z',
    },
    {
        uniqId: 'user-2',
        firstName: 'Test',
        lastName: 'Bravo',
        email: 'bravo@example.invalid',
        phone: '+225 00 00 00 01',
        profile: 'Profil B',
        role: 'custom-role',
        status: 'inactive',
        updatedAt: '2026-09-25T08:00:00Z',
    },
] as const;

interface SetupOptions {
    authorized?: boolean;
    layout?: 'compact' | 'medium' | 'expanded';
    submitError?: Error;
    usersState?: 'success' | 'error' | 'empty' | 'loading' | 'reloading';
}

async function setup(options: SetupOptions = {}) {
    const layoutState = new BehaviorSubject<BreakpointState>(
        breakpointState(options.layout ?? 'medium')
    );
    const usersState = signal(options.usersState ?? 'success');
    const profilesState = signal<'success' | 'error'>('success');
    const items = signal(options.usersState === 'empty' ? [] : USERS);
    const page = signal({
        items: items(),
        currentPage: 1,
        lastPage: 3,
        pageSize: 2,
        totalItems: 6,
    });
    const profiles = signal([
        { value: 'profile-a', label: 'Profil A' },
        { value: 'profile-b', label: 'Profil B' },
    ]);
    const loadUsers = vi.fn();
    const loadProfiles = vi.fn();
    const submitUser = vi.fn(() =>
        options.submitError
            ? throwError(() => options.submitError)
            : of({ message: 'SUCCESS' })
    );
    const composition = {
        profilesSelect: {
            items: profiles,
            state: profilesState,
            load: loadProfiles,
        },
        usersList: {
            items,
            page,
            state: usersState,
            load: loadUsers,
        },
        createUser: {
            state: signal('idle'),
            result: signal(undefined),
            error: signal(undefined),
            authorized: signal(options.authorized ?? true),
            deniedBehavior: 'disable',
            submit: submitUser,
        },
    } as unknown as PageComposition;

    TestBed.configureTestingModule({
        imports: [PageComponent],
        providers: [
            {
                provide: BreakpointObserver,
                useValue: { observe: () => layoutState.asObservable() },
            },
        ],
    });
    TestBed.overrideComponent(PageComponent, {
        set: {
            providers: [{ provide: PageComposition, useValue: composition }],
        },
    });
    const fixture = TestBed.createComponent(PageComponent);
    await fixture.whenStable();
    return {
        fixture,
        loadProfiles,
        loadUsers,
        setLayout: (layout: NonNullable<SetupOptions['layout']>) =>
            layoutState.next(breakpointState(layout)),
        submitUser,
        usersState,
    };
}

function breakpointState(
    layout: NonNullable<SetupOptions['layout']>
): BreakpointState {
    const compact = layout === 'compact';
    const expanded = layout === 'expanded';
    return {
        matches: compact || expanded,
        breakpoints: {
            [PAGE_COMPACT_MEDIA_QUERY]: compact,
            [PAGE_EXPANDED_MEDIA_QUERY]: expanded,
        },
    };
}

function element<T extends Element>(root: Element, selector: string): T {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Élément introuvable: ${selector}`);
    return found;
}

function setControl(control: Element, value: string): void {
    if (
        !(control instanceof HTMLInputElement) &&
        !(control instanceof HTMLSelectElement)
    ) {
        throw new Error('Le contrôle doit être un input ou un select.');
    }
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    if (control instanceof HTMLSelectElement) {
        control.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

async function fillValidForm(root: HTMLElement): Promise<void> {
    setControl(element(root, '[data-cmz-id="first-name"]'), '  Ada  ');
    setControl(element(root, '[data-cmz-id="last-name"]'), '  Lovelace  ');
    setControl(element(root, '[data-cmz-id="email"]'), ' ada@example.test ');
    setControl(element(root, '[data-cmz-id="phone"]'), ' +225 01 02 03 04 ');
    setControl(element(root, '[data-cmz-id="profile-id"]'), 'profile-a');
}

afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('PageComponent', () => {
    it('charge les deux requêtes à l’entrée et rend une liste accessible', async () => {
        const { fixture, loadProfiles, loadUsers } = await setup();
        const root = fixture.nativeElement as HTMLElement;

        expect(loadProfiles).toHaveBeenCalledOnce();
        expect(loadUsers).toHaveBeenCalledWith({ page: 1 });
        expect(element(root, 'main').getAttribute('data-cmz-id')).toBe('main');
        expect(element(root, 'table caption').textContent).toContain(
            'Liste des utilisateurs'
        );
        expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(root.textContent).toContain('alpha@example.invalid');
        expect(root.textContent).toContain('Superviseur');
        expect(root.textContent).toContain('custom-role');
        expect(root.querySelectorAll('th[scope="col"]')).toHaveLength(7);
        expect(root.querySelectorAll('.page-number')).toHaveLength(2);
        expect(
            element(root, '[aria-label="Page 1"]').getAttribute('aria-current')
        ).toBe('page');
    });

    it('échoue fermé sans permission et ne soumet aucune commande', async () => {
        const { fixture, submitUser } = await setup({ authorized: false });
        const root = fixture.nativeElement as HTMLElement;
        const create = element<HTMLButtonElement>(
            root,
            '[data-cmz-id="create-user"]'
        );

        expect(create.disabled).toBe(true);
        expect(create.getAttribute('aria-describedby')).toBe('create-denied');
        create.click();
        await fixture.whenStable();
        expect(root.querySelector('[role="dialog"]')).toBeNull();
        expect(submitUser).not.toHaveBeenCalled();
    });

    it('applique les filtres typés et pagine sans inventer de paramètre', async () => {
        const { fixture, loadUsers } = await setup();
        const root = fixture.nativeElement as HTMLElement;
        const filters = element<HTMLFormElement>(root, '.filters');
        const controls = filters.querySelectorAll('input, select');

        setControl(controls[0] as HTMLInputElement, '  Alpha  ');
        setControl(controls[1] as HTMLSelectElement, 'profile-a');
        setControl(controls[2] as HTMLSelectElement, 'agent');
        setControl(controls[3] as HTMLSelectElement, 'inactive');
        filters.dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        );
        await fixture.whenStable();

        expect(loadUsers).toHaveBeenLastCalledWith({
            page: 1,
            search: 'Alpha',
            profile: 'profile-a',
            role: 'agent',
            isActive: false,
        });

        const next = Array.from(root.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Suivant'
        ) as HTMLButtonElement;
        next.click();
        await fixture.whenStable();
        expect(loadUsers).toHaveBeenLastCalledWith({
            page: 2,
            search: 'Alpha',
            profile: 'profile-a',
            role: 'agent',
            isActive: false,
        });

        element<HTMLButtonElement>(root, '[aria-label="Page 1"]').click();
        await fixture.whenStable();
        expect(loadUsers).toHaveBeenLastCalledWith({
            page: 1,
            search: 'Alpha',
            profile: 'profile-a',
            role: 'agent',
            isActive: false,
        });
    });

    it('rend les actions de filtres compactes accessibles sans appel implicite', async () => {
        const { fixture, loadUsers } = await setup();
        const root = fixture.nativeElement as HTMLElement;
        const toggle = element<HTMLButtonElement>(root, '.filter-toggle');
        const options = element<HTMLElement>(root, '.filter-options');

        expect(toggle.getAttribute('aria-controls')).toBe(
            'secondary-user-filters'
        );
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(options.classList.contains('filter-options-open')).toBe(false);

        toggle.click();
        await fixture.whenStable();

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(options.classList.contains('filter-options-open')).toBe(true);
        expect(loadUsers).toHaveBeenCalledTimes(1);

        setControl(element<HTMLSelectElement>(options, 'select'), 'profile-a');
        await fixture.whenStable();
        expect(toggle.textContent).toContain('1 actif');

        element<HTMLButtonElement>(options, '[type="submit"]').click();
        await fixture.whenStable();
        expect(loadUsers).toHaveBeenLastCalledWith({
            page: 1,
            profile: 'profile-a',
        });

        const clear = Array.from(options.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Effacer'
        );
        if (!clear) throw new Error('Action Effacer introuvable.');
        clear.click();
        await fixture.whenStable();

        expect(element<HTMLSelectElement>(options, 'select').value).toBe('');
        expect(toggle.textContent).not.toContain('actif');
        expect(loadUsers).toHaveBeenLastCalledWith({ page: 1 });
    });

    it('garde les données périmées visibles quand une actualisation échoue', async () => {
        const { fixture } = await setup({ usersState: 'error' });
        const root = fixture.nativeElement as HTMLElement;

        expect(
            root.querySelector('[data-cmz-id="query-failed"]')
        ).not.toBeNull();
        expect(root.querySelector('[data-cmz-id="ready"]')).not.toBeNull();
        expect(root.textContent).toContain('alpha@example.invalid');
    });

    it('expose les erreurs requises et email sans appeler la commande', async () => {
        const { fixture, submitUser } = await setup();
        const root = fixture.nativeElement as HTMLElement;
        element<HTMLButtonElement>(root, '[data-cmz-id="create-user"]').click();
        await fixture.whenStable();
        const form = element<HTMLFormElement>(
            root,
            '[data-cmz-id="create-user-form"]'
        );

        setControl(element(root, '[data-cmz-id="first-name"]'), '   ');
        setControl(element(root, '[data-cmz-id="email"]'), 'adresse-invalide');
        form.dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        );
        await fixture.whenStable();

        expect(submitUser).not.toHaveBeenCalled();
        expect(root.textContent).toContain('Le prénom est obligatoire.');
        expect(root.textContent).toContain(
            'Saisissez une adresse email valide.'
        );
        expect(
            element(root, '[data-cmz-id="email"]').getAttribute('aria-invalid')
        ).toBe('true');
    });

    it('soumet un payload normalisé, ferme le dialogue et annonce le succès', async () => {
        const { fixture, submitUser, loadUsers } = await setup();
        const root = fixture.nativeElement as HTMLElement;
        element<HTMLButtonElement>(root, '[data-cmz-id="create-user"]').click();
        await fixture.whenStable();
        await fillValidForm(root);
        await fixture.whenStable();

        element<HTMLFormElement>(
            root,
            '[data-cmz-id="create-user-form"]'
        ).dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        );
        await fixture.whenStable();

        expect(submitUser).toHaveBeenCalledOnce();
        expect(submitUser).toHaveBeenCalledWith({
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.test',
            phone: '+225 01 02 03 04',
            profileId: 'profile-a',
        });
        expect(root.querySelector('[role="dialog"]')).toBeNull();
        expect(
            element(root, '[data-cmz-id="created"]').getAttribute('role')
        ).toBe('status');
        expect(loadUsers).toHaveBeenCalledTimes(1);
    });

    it('conserve le formulaire et les valeurs après un conflit email', async () => {
        const { fixture, submitUser } = await setup({
            submitError: new Error('email existe déjà'),
        });
        const root = fixture.nativeElement as HTMLElement;
        element<HTMLButtonElement>(root, '[data-cmz-id="create-user"]').click();
        await fixture.whenStable();
        await fillValidForm(root);
        await fixture.whenStable();

        element<HTMLFormElement>(
            root,
            '[data-cmz-id="create-user-form"]'
        ).dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        );
        await fixture.whenStable();

        expect(submitUser).toHaveBeenCalledOnce();
        expect(root.querySelector('[role="dialog"]')).not.toBeNull();
        expect(
            element<HTMLInputElement>(root, '[data-cmz-id="email"]').value
        ).toContain('ada@example.test');
        expect(root.textContent).toContain('Cette adresse email existe déjà.');
        expect(
            element(root, '[data-cmz-id="create-failed"]').getAttribute('role')
        ).toBe('alert');

        const create = element<HTMLButtonElement>(
            root,
            '[data-cmz-id="create-user-form"] [type="submit"]'
        );
        expect(create.disabled).toBe(true);
        setControl(
            element(root, '[data-cmz-id="email"]'),
            'autre@example.test'
        );
        await fixture.whenStable();
        expect(create.disabled).toBe(false);
        expect(root.querySelector('[data-cmz-id="create-failed"]')).toBeNull();
        expect(root.querySelector('.toast-error')).toBeNull();
    });

    it('ferme par Échap et rend le focus au déclencheur', async () => {
        const { fixture } = await setup();
        const root = fixture.nativeElement as HTMLElement;
        const create = element<HTMLButtonElement>(
            root,
            '[data-cmz-id="create-user"]'
        );
        create.click();
        await fixture.whenStable();
        const dialog = element<HTMLElement>(root, '[role="dialog"]');

        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(element(root, 'main').hasAttribute('inert')).toBe(true);
        dialog.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
        await fixture.whenStable();

        expect(root.querySelector('[role="dialog"]')).toBeNull();
        expect(document.activeElement).toBe(create);
    });

    it('adapte la modalité sans recréer le formulaire ni perdre son focus', async () => {
        const { fixture, setLayout } = await setup({ layout: 'compact' });
        const root = fixture.nativeElement as HTMLElement;
        const create = element<HTMLButtonElement>(
            root,
            '[data-cmz-id="create-user"]'
        );
        create.click();
        await fixture.whenStable();

        const email = element<HTMLInputElement>(root, '[data-cmz-id="email"]');
        setControl(email, 'conserve@example.test');
        email.focus();

        setLayout('expanded');
        await fixture.whenStable();

        const expandedDialog = element<HTMLElement>(root, '[role="dialog"]');
        expect(expandedDialog.getAttribute('aria-modal')).toBeNull();
        expect(root.querySelector('.backdrop')).toBeNull();
        expect(element(root, 'main').hasAttribute('inert')).toBe(false);
        expect(element(root, '[data-cmz-id="email"]')).toBe(email);
        expect(email.value).toBe('conserve@example.test');
        expect(document.activeElement).toBe(email);
        expect(create.disabled).toBe(true);

        setLayout('compact');
        await fixture.whenStable();

        expect(
            element(root, '[role="dialog"]').getAttribute('aria-modal')
        ).toBe('true');
        expect(root.querySelector('.backdrop')).not.toBeNull();
        expect(element(root, 'main').hasAttribute('inert')).toBe(true);
        expect(element(root, '[data-cmz-id="email"]')).toBe(email);
        expect(document.activeElement).toBe(email);
    });
});

describe('PAGE_PERMISSION_PROVIDER', () => {
    it('adapte explicitement la décision du host au port de composition', () => {
        TestBed.configureTestingModule({
            providers: [
                PAGE_PERMISSION_PROVIDER,
                {
                    provide: APP_ACCESS_DECISION,
                    useValue: {
                        isAuthenticated: () => true,
                        hasPermission: (permission: string) =>
                            permission === 'users.create',
                    },
                },
            ],
        });

        const port = TestBed.inject(PAGE_ACTION_PERMISSION_PORT);
        expect(port.has('users.create')()).toBe(true);
        expect(port.has('users.delete')()).toBe(false);
    });
});
