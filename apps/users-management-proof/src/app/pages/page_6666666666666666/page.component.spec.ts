import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
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
import { PageCreateComponent } from './page.create.component';

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
    const submitUser = vi.fn(() => of({ message: 'SUCCESS' }));
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

// Le formulaire appartient au sous-composant, testé dans son propre spec :
// ici, seul le contrat `created` / `closed` vu par la page est exercé.
function createDialog(
    fixture: ComponentFixture<PageComponent>
): PageCreateComponent {
    return fixture.debugElement.query(By.directive(PageCreateComponent))
        .componentInstance as PageCreateComponent;
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
        expect(element(root, 'table').getAttribute('aria-labelledby')).toBe(
            'users-table-title'
        );
        expect(element(root, '#users-table-title').textContent).toContain(
            'Utilisateurs'
        );
        expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(root.textContent).toContain('alpha@example.invalid');
        expect(root.textContent).toContain('Superviseur');
        expect(root.textContent).toContain('custom-role');
        expect(root.querySelectorAll('th[scope="col"]')).toHaveLength(8);
        expect(
            element(root, '[data-cmz-id="row-rank-header"]').textContent?.trim()
        ).toBe('#');
        expect(
            Array.from(root.querySelectorAll('[data-cmz-row-rank]')).map(
                (cell) => cell.textContent?.trim()
            )
        ).toEqual(['1', '2']);
        expect(root.querySelectorAll('.page-number')).toHaveLength(2);
        expect(
            element(root, '[aria-label="Page 1"]').getAttribute('aria-current')
        ).toBe('page');
    });

    it('ordonne les commandes compactes avant la recherche et explicite le FAB', async () => {
        const { fixture } = await setup({ layout: 'compact' });
        const root = fixture.nativeElement as HTMLElement;
        const search = element<HTMLInputElement>(root, '[type="search"]');
        const label = element<HTMLLabelElement>(root, '.filter-search');
        const searchRegion = element<HTMLFormElement>(
            root,
            '[data-cmz-id="table-search"]'
        );
        const toggle = element<HTMLButtonElement>(root, '.filter-toggle');
        const create = element<HTMLButtonElement>(
            root,
            '[data-cmz-id="create-user"]'
        );

        expect(label.textContent).toContain('Rechercher un utilisateur');
        expect(search.placeholder).toBe('Nom, prénom ou adresse e-mail');
        expect(searchRegion.getAttribute('role')).toBe('search');
        expect(searchRegion.contains(label)).toBe(true);
        expect(
            toggle.compareDocumentPosition(label) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).not.toBe(0);
        expect(
            element(create, '.create-button-icon').getAttribute('aria-hidden')
        ).toBe('true');
        expect(create.getAttribute('aria-label')).toBe('Créer un utilisateur');
        expect(create.title).toBe('Créer un utilisateur');
        expect(create.querySelector('.create-button-icon')).not.toBeNull();
        const semanticLabel = element<HTMLElement>(
            create,
            '[data-cmz-command-label]'
        );
        expect(semanticLabel.textContent?.trim()).toBe('Créer');
        expect(semanticLabel.classList.contains('command-label')).toBe(true);
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
        element<HTMLFormElement>(
            root,
            '[data-cmz-id="table-command-cluster"]'
        ).dispatchEvent(new Event('submit', { cancelable: true }));
        setControl(
            element(root, '[data-cmz-filter-shortcut="profile"]'),
            'profile-a'
        );
        setControl(element(root, '[data-cmz-filter-shortcut="role"]'), 'agent');
        setControl(
            element(root, '[data-cmz-filter-shortcut="status"]'),
            'inactive'
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

    it('n’applique jamais une recherche non soumise', async () => {
        const { fixture, loadUsers } = await setup({ layout: 'medium' });
        const root = fixture.nativeElement as HTMLElement;
        const button = (label: string) =>
            Array.from(root.querySelectorAll('button')).find(
                (candidate) => candidate.textContent?.trim() === label
            ) as HTMLButtonElement;
        setControl(element(root, '[type="search"]'), 'Alpha');
        await fixture.whenStable();

        button('Suivant').click();
        await fixture.whenStable();
        expect(loadUsers).toHaveBeenLastCalledWith({ page: 2 });

        element<HTMLButtonElement>(
            root,
            '[data-cmz-toolbar-action="refresh"]'
        ).click();
        await fixture.whenStable();
        // La façade simulée reste sur la page 1 : seul compte l'absence de
        // paramètre de recherche.
        expect(loadUsers).toHaveBeenLastCalledWith({ page: 1 });

        setControl(element(root, '[data-cmz-filter-shortcut="role"]'), 'agent');
        await fixture.whenStable();
        expect(loadUsers).toHaveBeenLastCalledWith({ page: 1, role: 'agent' });

        element<HTMLFormElement>(
            root,
            '[data-cmz-id="table-command-cluster"]'
        ).dispatchEvent(new Event('submit', { cancelable: true }));
        await fixture.whenStable();
        expect(loadUsers).toHaveBeenLastCalledWith({
            page: 1,
            search: 'Alpha',
            role: 'agent',
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

    it('abandonne le brouillon à la fermeture du panneau expanded sans appeler le réseau', async () => {
        const { fixture, loadUsers } = await setup({ layout: 'expanded' });
        const root = fixture.nativeElement as HTMLElement;
        setControl(element(root, '[data-cmz-filter-shortcut="role"]'), 'agent');
        await fixture.whenStable();
        const toggle = element<HTMLButtonElement>(root, '.filter-toggle');
        toggle.click();
        await fixture.whenStable();

        let pane = element<HTMLElement>(root, '#user-filter-panel');
        expect(element(root, 'main').hasAttribute('inert')).toBe(false);
        setControl(
            element<HTMLSelectElement>(pane, '[aria-label="Rôle"]'),
            'supervisor'
        );
        pane.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
        await fixture.whenStable();
        expect(root.querySelector('#user-filter-panel')).toBeNull();
        expect(loadUsers).toHaveBeenCalledTimes(2);

        toggle.click();
        await fixture.whenStable();
        pane = element(root, '#user-filter-panel');
        expect(
            element<HTMLSelectElement>(pane, '[aria-label="Rôle"]').value
        ).toBe('agent');
        expect(loadUsers).toHaveBeenCalledTimes(2);
    });

    it('garde le défilement du tableau atteignable au clavier quand le panneau désactive les raccourcis', async () => {
        const { fixture } = await setup({ layout: 'medium' });
        const root = fixture.nativeElement as HTMLElement;
        element<HTMLButtonElement>(root, '.filter-toggle').click();
        await fixture.whenStable();

        // Panneau ouvert : plus aucun contrôle focalisable dans le tableau.
        expect(
            Array.from(
                root.querySelectorAll<HTMLSelectElement>(
                    '[data-cmz-filter-shortcut]'
                )
            ).map((shortcut) => shortcut.disabled)
        ).toEqual([true, true, true]);
        const scroller = element<HTMLElement>(
            root,
            '[data-cmz-id="users-table"]'
        );
        expect(scroller.tabIndex).toBe(0);
        expect(scroller.getAttribute('role')).toBe('region');
        expect(scroller.getAttribute('aria-labelledby')).toBe(
            'users-table-title'
        );
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

    it('ouvre le dialogue, puis sur `created` le ferme, annonce le succès et rend le focus', async () => {
        const { fixture, loadUsers } = await setup();
        const root = fixture.nativeElement as HTMLElement;
        const create = element<HTMLButtonElement>(
            root,
            '[data-cmz-id="create-user"]'
        );
        create.click();
        await fixture.whenStable();

        expect(root.querySelectorAll('app-page-create')).toHaveLength(1);
        expect(element(root, 'main').hasAttribute('inert')).toBe(true);
        expect(create.disabled).toBe(true);
        expect(root.querySelector('[data-cmz-id="created"]')).toBeNull();

        createDialog(fixture).created.emit();
        await fixture.whenStable();

        expect(root.querySelector('app-page-create')).toBeNull();
        expect(root.querySelector('[role="dialog"]')).toBeNull();
        expect(element(root, 'main').hasAttribute('inert')).toBe(false);
        expect(
            element(root, '[data-cmz-id="created"]').getAttribute('role')
        ).toBe('status');
        expect(loadUsers).toHaveBeenCalledTimes(2);
        expect(loadUsers).toHaveBeenLastCalledWith({ page: 1 });
        expect(document.activeElement).toBe(create);
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

    it('reste modal sans recréer le formulaire ni perdre son focus', async () => {
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
        expect(expandedDialog.getAttribute('aria-modal')).toBe('true');
        expect(root.querySelector('.backdrop')).not.toBeNull();
        expect(element(root, 'main').hasAttribute('inert')).toBe(true);
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

    it('accumule les pages compactes dans l’ordre et déduplique uniqId', async () => {
        const { fixture, intersectSentinel, loadUsers, setUsersPage } =
            await setup({ layout: 'compact' });
        const root = fixture.nativeElement as HTMLElement;

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
        expect(root.textContent?.match(/bravo@example\.invalid/g)).toHaveLength(
            1
        );
        expect(root.textContent).toContain('charlie@example.invalid');
    });

    it('verrouille la page suivante puis expose un retry borné après erreur', async () => {
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
    });

    it('réinitialise explicitement la projection compacte sur page 1 après création', async () => {
        const { fixture, loadUsers } = await setup({ layout: 'compact' });
        const root = fixture.nativeElement as HTMLElement;
        loadUsers.mockClear();

        element<HTMLButtonElement>(root, '[data-cmz-id="create-user"]').click();
        await fixture.whenStable();
        createDialog(fixture).created.emit();
        await fixture.whenStable();

        expect(loadUsers).toHaveBeenCalledOnce();
        expect(loadUsers).toHaveBeenCalledWith({ page: 1 });
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
