import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
    ListUsersPage,
    UserListItem,
} from '../../generated/page_6666666666666666/angular/src/nodes/users-list/models';
import { PageResultsComponent } from './page.results.component';

function user(
    uniqId: string,
    overrides: Partial<UserListItem> = {}
): UserListItem {
    return {
        uniqId,
        firstName: 'Prénom',
        lastName: 'Nom',
        email: `${uniqId}@example.invalid`,
        phone: '+225 00 00 00 00',
        profile: 'Profil',
        role: 'agent',
        status: 'active',
        updatedAt: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

function page(items: readonly UserListItem[]): ListUsersPage {
    return {
        items,
        currentPage: 1,
        lastPage: 1,
        pageSize: items.length,
        totalItems: items.length,
    };
}

const USERS: readonly UserListItem[] = [
    user('alpha', { lastName: 'Alpha' }),
    user('bravo', { lastName: 'Bravo' }),
];

type Inputs = Record<string, unknown>;

async function setup(overrides: Inputs = {}) {
    TestBed.configureTestingModule({ imports: [PageResultsComponent] });
    const fixture = TestBed.createComponent(PageResultsComponent);
    await set(fixture, {
        layout: 'medium',
        filtersOpen: false,
        loading: false,
        empty: false,
        queryFailed: false,
        reloading: false,
        page: page(USERS),
        profiles: [
            { value: 'profile-a', label: 'Profil A' },
            { value: 'profile-b', label: 'Profil B' },
        ],
        appliedFilters: { profile: '', role: '', status: '' },
        mobileUsers: USERS,
        mobileHasNext: false,
        mobileLoadingNext: false,
        mobileFailed: false,
        mobileAnnouncement: '',
        loadGeneration: 1,
        scrollRoot: document.createElement('div'),
        ...overrides,
    });
    return { fixture, root: fixture.nativeElement as HTMLElement };
}

async function set(
    fixture: ComponentFixture<PageResultsComponent>,
    inputs: Inputs
): Promise<void> {
    for (const [name, value] of Object.entries(inputs))
        fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
}

function element<T extends Element>(root: Element, selector: string): T {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Élément introuvable: ${selector}`);
    return found;
}

function texts(root: Element, selector: string): (string | undefined)[] {
    return Array.from(root.querySelectorAll(selector)).map((node) =>
        node.textContent?.trim()
    );
}

async function sortBy(
    fixture: ComponentFixture<PageResultsComponent>,
    root: Element,
    column: string
): Promise<void> {
    element<HTMLElement>(
        root,
        `th[mat-sort-header="${column}"] [role="button"]`
    ).click();
    await fixture.whenStable();
}

function rowEmails(root: Element): (string | undefined)[] {
    return texts(root, 'tbody tr td:nth-child(4)');
}

function actionDescription(root: Element, column: string): string {
    const control = element<HTMLElement>(
        root,
        `th[mat-sort-header="${column}"] [role="button"]`
    );
    const ids = control.getAttribute('aria-describedby')?.split(' ') ?? [];
    return ids
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
}

afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('PageResultsComponent — tri client', () => {
    it('expose exactement sept tris Material hors Compact et jamais le rang', async () => {
        const { fixture, root } = await setup();
        const columns = () =>
            Array.from(root.querySelectorAll('[mat-sort-header]')).map(
                (header) => header.getAttribute('mat-sort-header')
            );

        expect(columns()).toEqual([
            'lastName',
            'firstName',
            'email',
            'profile',
            'role',
            'status',
            'updatedAt',
        ]);
        expect(
            root
                .querySelector('[data-cmz-id="row-rank-header"]')
                ?.hasAttribute('mat-sort-header')
        ).toBe(false);
        expect(root.querySelectorAll('[role="button"]')).toHaveLength(7);

        await set(fixture, { layout: 'compact' });
        expect(root.querySelectorAll('[mat-sort-header]')).toHaveLength(0);

        await set(fixture, { layout: 'expanded' });
        expect(columns()).toHaveLength(7);
    });

    it('cycle croissant, décroissant, ordre reçu avec état et annonces uniques', async () => {
        const { fixture, root } = await setup();
        const announcer = TestBed.inject(LiveAnnouncer);
        const announce = vi
            .spyOn(announcer, 'announce')
            .mockResolvedValue(undefined);
        const header = () => element(root, 'th[mat-sort-header="lastName"]');

        expect(header().getAttribute('aria-sort')).toBe('none');
        expect(actionDescription(root, 'lastName')).toContain(
            'lignes affichées par Nom, ordre croissant'
        );
        expect(actionDescription(root, 'lastName')).not.toContain('actif');

        await sortBy(fixture, root, 'lastName');
        expect(header().getAttribute('aria-sort')).toBe('ascending');
        expect(root.querySelector('#users-sort-status')).toBeNull();
        expect(root.querySelector('table[aria-describedby]')).toBeNull();
        expect(actionDescription(root, 'lastName')).toContain(
            'Tri croissant actif. Trier les lignes affichées par Nom, ordre décroissant'
        );

        await sortBy(fixture, root, 'lastName');
        expect(header().getAttribute('aria-sort')).toBe('descending');
        expect(rowEmails(root)).toEqual([
            'bravo@example.invalid',
            'alpha@example.invalid',
        ]);
        expect(actionDescription(root, 'lastName')).toContain(
            'Tri décroissant actif. Rétablir l’ordre reçu pour les lignes affichées'
        );

        await sortBy(fixture, root, 'lastName');
        expect(header().getAttribute('aria-sort')).toBe('none');
        expect(root.querySelector('#users-sort-status')).toBeNull();
        expect(rowEmails(root)).toEqual([
            'alpha@example.invalid',
            'bravo@example.invalid',
        ]);
        expect(announce).toHaveBeenCalledTimes(3);
        expect(announce.mock.calls.map(([message]) => message)).toEqual([
            'Lignes affichées triées par Nom, ordre croissant',
            'Lignes affichées triées par Nom, ordre décroissant',
            'Ordre reçu rétabli pour les lignes affichées',
        ]);
    });

    it('projette les sept colonnes avec une seule direction active', async () => {
        const items = [
            user('u-1', {
                firstName: 'Alpha',
                lastName: 'Zulu',
                email: 'zulu@example.invalid',
                profile: 'Bêta',
                role: 'supervisor',
                status: 'inactive',
                updatedAt: '2026-02-01T00:00:00Z',
            }),
            user('u-2', {
                firstName: 'Zulu',
                lastName: 'Alpha',
                email: 'alpha@example.invalid',
                profile: 'Alpha',
                role: 'agent',
                status: 'active',
                updatedAt: '2026-01-01T00:00:00Z',
            }),
        ];
        const { fixture, root } = await setup({ page: page(items) });
        const expectedFirstEmail: Readonly<Record<string, string>> = {
            lastName: 'alpha@example.invalid',
            firstName: 'zulu@example.invalid',
            email: 'alpha@example.invalid',
            profile: 'alpha@example.invalid',
            role: 'alpha@example.invalid',
            status: 'alpha@example.invalid',
            updatedAt: 'alpha@example.invalid',
        };

        for (const [column, firstEmail] of Object.entries(expectedFirstEmail)) {
            await sortBy(fixture, root, column);
            expect(rowEmails(root)[0]).toBe(firstEmail);
            expect(
                root.querySelectorAll('[aria-sort="ascending"]')
            ).toHaveLength(1);
        }
    });

    it('applique la collation française sans casse avec stabilité explicite', async () => {
        const items = ['Zoé', 'Élodie', 'a', 'A', 'côté', 'cote'].map(
            (lastName, index) =>
                user(`u-${index}`, {
                    email: `${index}@example.invalid`,
                    lastName,
                })
        );
        const before = items.map(({ uniqId }) => uniqId);
        const sourcePage = page(items);
        const { fixture, root } = await setup({ page: sourcePage });

        await sortBy(fixture, root, 'lastName');

        expect(texts(root, 'tbody tr td:nth-child(2)')).toEqual([
            'a',
            'A',
            'cote',
            'côté',
            'Élodie',
            'Zoé',
        ]);
        expect(sourcePage.items).toBe(items);
        expect(items.map(({ uniqId }) => uniqId)).toEqual(before);
    });

    it('garde rôles absents et dates absentes en dernier dans les deux sens', async () => {
        const roleItems = [
            user('role-null', { role: null }),
            user('role-agent', { role: 'agent' }),
            user('role-supervisor', { role: 'supervisor' }),
            user('role-team-leader', { role: 'team-leader' }),
            user('role-blank', { role: '   ' }),
        ];
        const roleView = await setup({ page: page(roleItems) });

        await sortBy(roleView.fixture, roleView.root, 'role');
        expect(rowEmails(roleView.root)).toEqual([
            'role-agent@example.invalid',
            'role-team-leader@example.invalid',
            'role-supervisor@example.invalid',
            'role-null@example.invalid',
            'role-blank@example.invalid',
        ]);
        await sortBy(roleView.fixture, roleView.root, 'role');
        expect(rowEmails(roleView.root)).toEqual([
            'role-supervisor@example.invalid',
            'role-team-leader@example.invalid',
            'role-agent@example.invalid',
            'role-null@example.invalid',
            'role-blank@example.invalid',
        ]);

        TestBed.resetTestingModule();
        const dateItems = [
            user('date-absent', { updatedAt: ' ' }),
            user('date-invalid-b', { updatedAt: 'zzz' }),
            user('date-late', { updatedAt: '2026-01-01T00:00:00Z' }),
            user('date-invalid-a', { updatedAt: 'aaa' }),
            user('date-early', { updatedAt: '2025-12-31T00:00:00Z' }),
        ];
        const dateView = await setup({ page: page(dateItems) });

        await sortBy(dateView.fixture, dateView.root, 'updatedAt');
        expect(rowEmails(dateView.root)).toEqual([
            'date-early@example.invalid',
            'date-late@example.invalid',
            'date-invalid-a@example.invalid',
            'date-invalid-b@example.invalid',
            'date-absent@example.invalid',
        ]);
        await sortBy(dateView.fixture, dateView.root, 'updatedAt');
        expect(rowEmails(dateView.root)).toEqual([
            'date-late@example.invalid',
            'date-early@example.invalid',
            'date-invalid-b@example.invalid',
            'date-invalid-a@example.invalid',
            'date-absent@example.invalid',
        ]);
    });

    it('réapplique le tri aux réponses suivantes sans trier les cartes Compact', async () => {
        const initial = [
            user('initial-a', { lastName: 'Alpha' }),
            user('initial-z', { lastName: 'Zulu' }),
        ];
        const replacement = [
            user('replacement-a', { lastName: 'Alpha' }),
            user('replacement-b', { lastName: 'Beta' }),
        ];
        const mobile = [
            user('mobile-z', { lastName: 'Zulu' }),
            user('mobile-a', { lastName: 'Alpha' }),
        ];
        const { fixture, root } = await setup({
            page: page(initial),
            mobileUsers: mobile,
        });

        await sortBy(fixture, root, 'lastName');
        await sortBy(fixture, root, 'lastName');
        await set(fixture, { layout: 'compact', page: page(replacement) });
        expect(texts(root, '.user-card strong')).toEqual([
            'Zulu Prénom',
            'Alpha Prénom',
        ]);

        await set(fixture, { layout: 'medium' });
        expect(rowEmails(root)).toEqual([
            'replacement-b@example.invalid',
            'replacement-a@example.invalid',
        ]);
        expect(
            element(root, 'th[mat-sort-header="lastName"]').getAttribute(
                'aria-sort'
            )
        ).toBe('descending');
    });
});
