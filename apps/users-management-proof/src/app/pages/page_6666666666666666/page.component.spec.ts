import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    PAGE_ACTION_PERMISSION_PORT,
    PageComposition,
} from '../../generated/page_6666666666666666/angular/src';
import type {
    ListUsersPage,
    UserListItem,
} from '../../generated/page_6666666666666666/angular/src/nodes/users-list/models';
import { APP_ACCESS_DECISION } from '../../access.guard';
import {
    PAGE_COMPACT_MEDIA_QUERY,
    PAGE_EXPANDED_MEDIA_QUERY,
    PAGE_PERMISSION_PROVIDER,
    PageComponent,
} from './page.component';

const USERS: readonly UserListItem[] = [
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
];

const DUPLICATED_USER = USERS[1];
if (!DUPLICATED_USER) throw new Error('Fixture utilisateur incomplète.');

const NEXT_USERS: readonly UserListItem[] = [
    DUPLICATED_USER,
    {
        uniqId: 'user-3',
        firstName: 'Test',
        lastName: 'Charlie',
        email: 'charlie@example.invalid',
        phone: '+225 00 00 00 02',
        profile: 'Profil C',
        role: 'agent',
        status: 'active',
        updatedAt: '2026-09-24T08:00:00Z',
    },
];

interface SetupOptions {
    authorized?: boolean;
    layout?: 'compact' | 'medium' | 'expanded';
    submitError?: Error;
    usersState?: 'success' | 'error' | 'empty' | 'loading' | 'reloading';
}

async function setup(options: SetupOptions = {}) {
    let observerCallback: IntersectionObserverCallback | undefined;
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            readonly disconnect = vi.fn();
            readonly observe = vi.fn();
            readonly unobserve = vi.fn();

            constructor(callback: IntersectionObserverCallback) {
                observerCallback = callback;
            }

            takeRecords(): IntersectionObserverEntry[] {
                return [];
            }
        }
    );
    const layoutState = new BehaviorSubject<BreakpointState>(
        breakpointState(options.layout ?? 'medium')
    );
    const usersState = signal(options.usersState ?? 'success');
    const profilesState = signal<'success' | 'error'>('success');
    const items = signal<readonly UserListItem[]>(
        options.usersState === 'empty' ? [] : USERS
    );
    const page = signal<ListUsersPage>({
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
        intersectSentinel: () => {
            if (!observerCallback) {
                throw new Error('IntersectionObserver non initialisé.');
            }
            observerCallback(
                [
                    {
                        isIntersecting: true,
                        intersectionRatio: 1,
                    } as IntersectionObserverEntry,
                ],
                {} as IntersectionObserver
            );
        },
        loadProfiles,
        loadUsers,
        setUsersPage: (nextPage: ListUsersPage) => {
            items.set(nextPage.items);
            page.set(nextPage);
            usersState.set(nextPage.items.length === 0 ? 'empty' : 'success');
        },
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
    vi.unstubAllGlobals();
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
        const { fixture, loadUsers } = await setup({ layout: 'medium' });
        const root = fixture.nativeElement as HTMLElement;
        setControl(element(root, '[type="search"]'), '  Alpha  ');
        element<HTMLButtonElement>(root, '.filter-toggle').click();
        await fixture.whenStable();
        const filters = element<HTMLFormElement>(root, '[role="dialog"]');

        setControl(
            element(filters, '[data-cmz-id="profiles"] select'),
            'profile-a'
        );
        setControl(element(filters, 'label:nth-of-type(2) select'), 'agent');
        setControl(element(filters, 'label:nth-of-type(3) select'), 'inactive');
        expect(loadUsers).toHaveBeenCalledTimes(1);
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
        const { fixture, loadUsers } = await setup({ layout: 'compact' });
        const root = fixture.nativeElement as HTMLElement;
        const toggle = element<HTMLButtonElement>(root, '.filter-toggle');

        expect(toggle.getAttribute('aria-controls')).toBe(
            'secondary-user-filters'
        );
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        toggle.click();
        await fixture.whenStable();
        let dialog = element<HTMLElement>(root, '[role="dialog"]');

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(dialog.querySelectorAll('input, select')).toHaveLength(0);
        expect(loadUsers).toHaveBeenCalledTimes(1);

        const statusSummary = Array.from(
            dialog.querySelectorAll('button')
        ).find((button) => button.textContent?.trim().startsWith('Statut'));
        if (!statusSummary) throw new Error('Filtre Statut introuvable.');
        statusSummary.click();
        await fixture.whenStable();
        dialog = element(root, '[role="dialog"]');
        const inactive = element<HTMLInputElement>(
            dialog,
            'input[type="radio"][value="inactive"]'
        );
        inactive.click();
        await fixture.whenStable();
        expect(inactive.checked).toBe(true);
        expect(loadUsers).toHaveBeenCalledTimes(1);

        const reset = Array.from(dialog.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Réinitialiser'
        );
        if (!reset) throw new Error('Action Réinitialiser introuvable.');
        reset.click();
        await fixture.whenStable();
        expect(
            element<HTMLInputElement>(dialog, 'input[type="radio"][value=""]')
                .checked
        ).toBe(true);
        expect(loadUsers).toHaveBeenCalledTimes(1);

        element<HTMLButtonElement>(
            dialog,
            '[aria-label="Fermer les filtres"]'
        ).click();
        await fixture.whenStable();
        toggle.click();
        await fixture.whenStable();
        dialog = element(root, '[role="dialog"]');
        const reopenedStatus = Array.from(
            dialog.querySelectorAll('button')
        ).find((button) => button.textContent?.trim().startsWith('Statut'));
        if (!reopenedStatus) throw new Error('Filtre Statut introuvable.');
        reopenedStatus.click();
        await fixture.whenStable();
        dialog = element(root, '[role="dialog"]');
        element<HTMLInputElement>(
            dialog,
            'input[type="radio"][value="inactive"]'
        ).click();

        const apply = Array.from(dialog.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Appliquer'
        );
        if (!apply) throw new Error('Action Appliquer introuvable.');
        apply.click();
        await fixture.whenStable();

        expect(root.querySelector('[role="dialog"]')).toBeNull();
        expect(toggle.getAttribute('aria-label')).toBe('Filtres (1)');
        expect(loadUsers).toHaveBeenCalledTimes(2);
        expect(loadUsers).toHaveBeenLastCalledWith({
            page: 1,
            isActive: false,
        });
    });

    it('conserve le brouillon lors du repli du pane expanded sans appeler le réseau', async () => {
        const { fixture, loadUsers } = await setup({ layout: 'expanded' });
        const root = fixture.nativeElement as HTMLElement;
        const toggle = element<HTMLButtonElement>(root, '.filter-toggle');
        toggle.click();
        await fixture.whenStable();

        let pane = element<HTMLElement>(root, '[role="complementary"]');
        expect(element(root, 'main').hasAttribute('inert')).toBe(false);
        setControl(
            element<HTMLSelectElement>(pane, 'label:nth-of-type(3) select'),
            'inactive'
        );
        element<HTMLButtonElement>(
            pane,
            '[aria-label="Replier les filtres"]'
        ).click();
        await fixture.whenStable();
        expect(root.querySelector('[role="complementary"]')).toBeNull();
        expect(loadUsers).toHaveBeenCalledTimes(1);

        toggle.click();
        await fixture.whenStable();
        pane = element(root, '[role="complementary"]');
        expect(
            element<HTMLSelectElement>(pane, 'label:nth-of-type(3) select')
                .value
        ).toBe('inactive');
        expect(loadUsers).toHaveBeenCalledTimes(1);
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

    it(
        'accumule les pages compactes dans l’ordre et déduplique uniqId',
        { fails: true },
        async () => {
            const { fixture, intersectSentinel, loadUsers, setUsersPage } =
                await setup({ layout: 'compact' });
            const root = fixture.nativeElement as HTMLElement;

            expect(
                root.querySelector('[aria-label="Pagination des utilisateurs"]')
            ).not.toBeNull();
            expect(
                root.querySelector('[data-cmz-id="mobile-load-sentinel"]')
            ).not.toBeNull();

            loadUsers.mockClear();
            intersectSentinel();
            await fixture.whenStable();
            expect(loadUsers).toHaveBeenCalledOnce();
            expect(loadUsers).toHaveBeenCalledWith({ page: 2 });

            setUsersPage({
                items: NEXT_USERS,
                currentPage: 2,
                lastPage: 2,
                pageSize: 2,
                totalItems: 3,
            });
            await fixture.whenStable();

            const cards = root.querySelectorAll('.user-card');
            expect(cards).toHaveLength(3);
            expect(
                root.textContent?.match(/bravo@example\.invalid/g)
            ).toHaveLength(1);
            expect(root.textContent).toContain('charlie@example.invalid');
        }
    );

    it(
        'verrouille la page suivante puis expose un retry borné après erreur',
        { fails: true },
        async () => {
            const { fixture, intersectSentinel, loadUsers, usersState } =
                await setup({ layout: 'compact' });
            const root = fixture.nativeElement as HTMLElement;

            expect(
                root.querySelector('[data-cmz-id="mobile-load-sentinel"]')
            ).not.toBeNull();
            loadUsers.mockClear();
            intersectSentinel();
            intersectSentinel();
            await fixture.whenStable();
            expect(loadUsers).toHaveBeenCalledOnce();
            expect(loadUsers).toHaveBeenCalledWith({ page: 2 });

            usersState.set('error');
            await fixture.whenStable();
            const retry = element<HTMLButtonElement>(
                root,
                '[data-cmz-id="mobile-load-retry"]'
            );
            retry.click();
            await fixture.whenStable();
            expect(loadUsers).toHaveBeenCalledTimes(2);
            expect(loadUsers).toHaveBeenLastCalledWith({ page: 2 });
        }
    );

    it(
        'réinitialise explicitement la projection compacte sur page 1 après création',
        { fails: true },
        async () => {
            const { fixture, loadUsers } = await setup({ layout: 'compact' });
            const root = fixture.nativeElement as HTMLElement;
            loadUsers.mockClear();

            element<HTMLButtonElement>(
                root,
                '[data-cmz-id="create-user"]'
            ).click();
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

            expect(loadUsers).toHaveBeenCalledOnce();
            expect(loadUsers).toHaveBeenCalledWith({ page: 1 });
        }
    );
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
