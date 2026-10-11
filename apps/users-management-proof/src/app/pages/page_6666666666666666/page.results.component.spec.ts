import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
    ListUsersPage,
    UserListItem,
} from '../../generated/page_6666666666666666/angular/src/nodes/users-list/models';
import {
    PageResultsComponent,
    type FilterShortcut,
} from './page.results.component';

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
        updatedAt: 'date-illisible',
    },
];

const PAGE_2_OF_3: ListUsersPage = {
    items: USERS,
    currentPage: 2,
    lastPage: 3,
    pageSize: 2,
    totalItems: 6,
};

interface ObserverRecord {
    readonly callback: IntersectionObserverCallback;
    readonly options: IntersectionObserverInit | undefined;
    readonly disconnect: ReturnType<typeof vi.fn>;
    readonly observe: ReturnType<typeof vi.fn>;
}

type Inputs = Record<string, unknown>;

async function setup(overrides: Inputs = {}) {
    const observers: ObserverRecord[] = [];
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            readonly disconnect = vi.fn();
            readonly observe = vi.fn();
            readonly unobserve = vi.fn();

            constructor(
                callback: IntersectionObserverCallback,
                options?: IntersectionObserverInit
            ) {
                observers.push({
                    callback,
                    options,
                    disconnect: this.disconnect,
                    observe: this.observe,
                });
            }

            takeRecords(): IntersectionObserverEntry[] {
                return [];
            }
        }
    );
    TestBed.configureTestingModule({ imports: [PageResultsComponent] });
    const fixture = TestBed.createComponent(PageResultsComponent);
    const scrollRoot = document.createElement('div');
    const addScroll = vi.spyOn(scrollRoot, 'addEventListener');
    const removeScroll = vi.spyOn(scrollRoot, 'removeEventListener');
    const inputs: Inputs = {
        layout: 'medium',
        filtersOpen: false,
        loading: false,
        empty: false,
        queryFailed: false,
        reloading: false,
        page: PAGE_2_OF_3,
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
        scrollRoot,
        ...overrides,
    };
    for (const [name, value] of Object.entries(inputs))
        fixture.componentRef.setInput(name, value);
    const shortcuts: FilterShortcut[] = [];
    const pages: number[] = [];
    const retries = vi.fn();
    const nexts = vi.fn();
    const component = fixture.componentInstance;
    component.filterShortcutApplied.subscribe((value) => shortcuts.push(value));
    component.pageRequested.subscribe((value) => pages.push(value));
    component.mobileRetryRequested.subscribe(retries);
    component.mobileNextRequested.subscribe(nexts);
    await fixture.whenStable();
    return {
        addScroll,
        fixture,
        nexts,
        observers,
        pages,
        removeScroll,
        retries,
        root: fixture.nativeElement as HTMLElement,
        scrollRoot,
        shortcuts,
    };
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

function intersect(observer: ObserverRecord | undefined): void {
    if (!observer) throw new Error('IntersectionObserver non créé.');
    observer.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
    );
}

const COMPACT_WITH_NEXT = { layout: 'compact', mobileHasNext: true };

afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('PageResultsComponent', () => {
    it('annonce le chargement sans élément décoratif vide', async () => {
        const { root } = await setup({ loading: true, page: undefined });
        const loading = element(root, '[data-cmz-id="loading"]');

        expect(loading.getAttribute('aria-live')).toBe('polite');
        expect(loading.textContent?.trim()).toBe(
            'Chargement des utilisateurs…'
        );
        expect(loading.children).toHaveLength(0);
        expect(root.querySelector('[data-cmz-id="ready"]')).toBeNull();
    });

    it('rend l’état vide seul', async () => {
        const { root } = await setup({ empty: true, page: undefined });

        expect(root.textContent).toContain('Aucun utilisateur trouvé');
        expect(root.querySelector('[data-cmz-id="ready"]')).toBeNull();
        expect(root.querySelector('[data-cmz-id="loading"]')).toBeNull();
    });

    it('signale l’erreur en conservant les données déjà chargées', async () => {
        const { root } = await setup({ queryFailed: true });

        expect(
            element(root, '[data-cmz-id="query-failed"]').getAttribute('role')
        ).toBe('alert');
        expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('rend un tableau nommé, rangé et mis en forme', async () => {
        const { root } = await setup();
        const region = element<HTMLElement>(
            root,
            '[data-cmz-id="users-table"]'
        );

        expect(region.getAttribute('role')).toBe('region');
        expect(region.tabIndex).toBe(0);
        expect(element(root, 'table').getAttribute('aria-labelledby')).toBe(
            'users-table-title'
        );
        expect(texts(root, '[data-cmz-row-rank]')).toEqual(['3', '4']);
        expect(texts(root, 'tbody tr:first-child td')).toEqual([
            '3',
            'Alpha',
            'Test',
            'alpha@example.invalid',
            'Profil A',
            'Superviseur',
            'Actif',
            '26/09/2026',
        ]);
        // Rôle inconnu et date illisible sont rendus tels quels.
        expect(texts(root, 'tbody tr:last-child td').slice(5)).toEqual([
            'custom-role',
            'Inactif',
            'date-illisible',
        ]);
        expect(root.querySelector('[data-cmz-id="mobile-results"]')).toBeNull();
    });

    it('pagine par intentions et verrouille pendant une actualisation', async () => {
        const { fixture, pages, root } = await setup();
        const buttons = () =>
            Array.from(
                root.querySelectorAll<HTMLButtonElement>('.pagination button')
            );

        expect(element(root, '.pagination span').textContent).toBe(
            '3–4 sur 6 utilisateurs'
        );
        expect(buttons().map((button) => button.textContent?.trim())).toEqual([
            'Précédent',
            '1',
            '2',
            'Suivant',
        ]);
        expect(
            element(root, '[aria-label="Page 2"]').getAttribute('aria-current')
        ).toBe('page');
        for (const button of buttons()) button.click();
        expect(pages).toEqual([1, 1, 2, 3]);

        await set(fixture, { reloading: true });
        expect(buttons().map((button) => button.disabled)).toEqual([
            true,
            false,
            false,
            true,
        ]);
        expect(element(root, '.refreshing').getAttribute('role')).toBe(
            'status'
        );
        expect(
            element(root, '[data-cmz-id="ready"]').getAttribute('aria-busy')
        ).toBe('true');
    });

    it('émet les raccourcis de colonne et reflète filtres et disposition', async () => {
        const { fixture, root, shortcuts } = await setup({
            appliedFilters: { profile: '', role: 'agent', status: '' },
        });
        const shortcut = (key: string) =>
            element<HTMLSelectElement>(
                root,
                `[data-cmz-filter-shortcut="${key}"]`
            );

        expect(shortcut('role').dataset['cmzFilterActive']).toBe('true');
        expect(shortcut('profile').dataset['cmzFilterActive']).toBeUndefined();
        shortcut('profile').value = 'profile-b';
        shortcut('profile').dispatchEvent(new Event('change'));
        expect(shortcuts).toEqual([{ key: 'profile', value: 'profile-b' }]);
        expect(root.classList.contains('filters-open')).toBe(false);

        await set(fixture, { filtersOpen: true });
        expect(root.classList.contains('filters-open')).toBe(true);
        expect(root.classList.contains('layout-compact')).toBe(false);
        expect(
            ['profile', 'role', 'status'].map((key) => shortcut(key).disabled)
        ).toEqual([true, true, true]);
    });

    it('projette des cartes en Compact, sans tableau ni pagination', async () => {
        const { fixture, root } = await setup({
            layout: 'compact',
            mobileAnnouncement: '1 utilisateur supplémentaire.',
        });
        const region = element(root, '[data-cmz-id="mobile-results"]');

        expect(root.classList.contains('layout-compact')).toBe(true);
        expect(region.getAttribute('role')).toBe('region');
        expect(region.querySelectorAll('li')).toHaveLength(2);
        expect(root.querySelector('table')).toBeNull();
        expect(root.querySelector('.pagination')).toBeNull();
        expect(
            element(root, '[data-cmz-id="mobile-load-status"]').textContent
        ).toContain('1 utilisateur supplémentaire.');
        // Rien à charger : aucune sentinelle.
        expect(
            root.querySelector('[data-cmz-id="mobile-load-sentinel"]')
        ).toBeNull();

        await set(fixture, { mobileLoadingNext: true });
        expect(region.getAttribute('aria-busy')).toBe('true');
        expect(
            element(root, '[data-cmz-id="mobile-load-status"]').textContent
        ).toContain('Chargement d’utilisateurs supplémentaires.');
    });

    it('propose une reprise bornée après un échec de page suivante', async () => {
        const { nexts, observers, retries, root } = await setup({
            ...COMPACT_WITH_NEXT,
            mobileFailed: true,
        });

        // En échec, l'automatisme est suspendu : aucun observateur.
        expect(observers).toHaveLength(0);
        expect(element(root, '.mobile-load-error').getAttribute('role')).toBe(
            'alert'
        );
        element<HTMLButtonElement>(
            root,
            '[data-cmz-id="mobile-load-retry"]'
        ).click();
        expect(retries).toHaveBeenCalledOnce();
        expect(nexts).not.toHaveBeenCalled();
    });

    it('dérive les lignes de la page reçue, sans entrée `users`', async () => {
        const { fixture, root } = await setup();
        expect(() => fixture.componentRef.setInput('users', [])).toThrow();

        await set(fixture, {
            page: { ...PAGE_2_OF_3, items: USERS.slice(0, 1) },
        });
        expect(root.querySelectorAll('tbody tr')).toHaveLength(1);

        await set(fixture, { page: undefined });
        expect(root.querySelector('[data-cmz-id="ready"]')).toBeNull();
    });

    it('observe la sentinelle dans la racine reçue et demande la suite une seule fois', async () => {
        const { fixture, nexts, observers, root, scrollRoot } =
            await setup(COMPACT_WITH_NEXT);
        const sentinel = element(root, '[data-cmz-id="mobile-load-sentinel"]');

        expect(observers).toHaveLength(1);
        expect(observers[0]?.options?.root).toBe(scrollRoot);
        expect(observers[0]?.options?.rootMargin).toBe('0px 0px 150% 0px');
        expect(observers[0]?.observe).toHaveBeenCalledWith(sentinel);

        intersect(observers[0]);
        // Une seconde notification de la même intersection, avant que la page
        // ait répercuté l'état de chargement.
        intersect(observers[0]);
        await fixture.whenStable();

        expect(nexts).toHaveBeenCalledOnce();
        expect(observers[0]?.disconnect).toHaveBeenCalledOnce();
        // Verrouillée tant que la page n'a pas pris la demande en charge.
        expect(observers).toHaveLength(1);
        expect(
            root.querySelector('[data-cmz-id="mobile-load-sentinel"]')
        ).not.toBeNull();
    });

    it('réobserve au premier état stabilisé après la fin du chargement', async () => {
        const { fixture, nexts, observers } = await setup(COMPACT_WITH_NEXT);
        intersect(observers[0]);
        await set(fixture, { mobileLoadingNext: true });
        expect(observers).toHaveLength(1);

        // Reprise au premier état stabilisé qui suit la fin du chargement.
        await set(fixture, { mobileLoadingNext: false });

        expect(observers).toHaveLength(2);
        intersect(observers[1]);
        expect(nexts).toHaveBeenCalledTimes(2);
    });

    it('démonte la sentinelle dès que la dernière page est résolue, sans durée minimale', async () => {
        const { fixture, observers, root } = await setup(COMPACT_WITH_NEXT);
        const mounted = () =>
            root.querySelectorAll('[data-cmz-id="mobile-load-sentinel"]')
                .length;
        intersect(observers[0]);
        // Demande émise, pas encore prise en charge : la sentinelle reste.
        await fixture.whenStable();
        expect(mounted()).toBe(1);

        // La page charge la dernière page.
        await set(fixture, { mobileLoadingNext: true });
        expect(mounted()).toBe(1);
        await set(fixture, { mobileLoadingNext: false, mobileHasNext: false });

        expect(mounted()).toBe(0);
        expect(observers).toHaveLength(1);
    });

    it('lève le verrou sur un échec ou une nouvelle génération', async () => {
        const failed = await setup(COMPACT_WITH_NEXT);
        intersect(failed.observers[0]);
        await set(failed.fixture, { mobileFailed: true });
        await set(failed.fixture, { mobileFailed: false });
        expect(failed.observers).toHaveLength(2);

        TestBed.resetTestingModule();
        const renewed = await setup(COMPACT_WITH_NEXT);
        intersect(renewed.observers[0]);
        await set(renewed.fixture, { loadGeneration: 2 });
        expect(renewed.observers).toHaveLength(2);
        expect(renewed.nexts).toHaveBeenCalledOnce();
    });

    it('n’observe pas hors Compact, pendant un chargement ou sans suite', async () => {
        const { fixture, observers } = await setup({
            layout: 'medium',
            mobileHasNext: true,
        });
        expect(observers).toHaveLength(0);

        await set(fixture, { layout: 'expanded' });
        await set(fixture, { mobileLoadingNext: true });
        await set(fixture, { mobileLoadingNext: false, mobileHasNext: false });
        expect(observers).toHaveLength(0);
    });

    it('n’anticipe rien en entrant en Compact, puis se réarme au défilement de sa racine', async () => {
        const documentScroll = vi.spyOn(document, 'addEventListener');
        const {
            addScroll,
            fixture,
            nexts,
            observers,
            removeScroll,
            root,
            scrollRoot,
        } = await setup({ layout: 'medium', mobileHasNext: true });

        await set(fixture, { layout: 'compact' });
        expect(observers).toHaveLength(0);
        const listener = addScroll.mock.calls.find(
            ([type]) => type === 'scroll'
        )?.[1] as EventListener;
        expect(listener).toBeTypeOf('function');
        expect(
            documentScroll.mock.calls.some(([type]) => type === 'scroll')
        ).toBe(false);

        const sentinel = element(root, '[data-cmz-id="mobile-load-sentinel"]');
        // Un défilement qui ne rapproche pas la sentinelle n'arme rien, pas
        // plus qu'un défilement survenu ailleurs que dans la racine.
        scrollRoot.dispatchEvent(new Event('scroll'));
        vi.spyOn(sentinel, 'getBoundingClientRect').mockReturnValue({
            top: -40,
        } as DOMRect);
        document.dispatchEvent(new Event('scroll'));
        await fixture.whenStable();
        expect(observers).toHaveLength(0);

        scrollRoot.dispatchEvent(new Event('scroll'));
        await fixture.whenStable();

        expect(observers).toHaveLength(1);
        expect(removeScroll).toHaveBeenCalledWith('scroll', listener);
        expect(nexts).not.toHaveBeenCalled();
    });

    it('se réarme à la génération de données suivante', async () => {
        const { fixture, observers } = await setup({
            layout: 'medium',
            mobileHasNext: true,
        });
        await set(fixture, { layout: 'compact' });
        expect(observers).toHaveLength(0);

        await set(fixture, { loadGeneration: 2 });
        expect(observers).toHaveLength(1);
    });

    it('suit un changement de racine sans laisser d’écouteur ni d’observateur', async () => {
        const waiting = await setup({ layout: 'medium', mobileHasNext: true });
        await set(waiting.fixture, { layout: 'compact' });
        const listener = waiting.addScroll.mock.calls.find(
            ([type]) => type === 'scroll'
        )?.[1];
        const nextRoot = document.createElement('div');
        const addNext = vi.spyOn(nextRoot, 'addEventListener');
        await set(waiting.fixture, { scrollRoot: nextRoot });

        expect(waiting.removeScroll).toHaveBeenCalledWith('scroll', listener);
        expect(addNext.mock.calls.some(([type]) => type === 'scroll')).toBe(
            true
        );

        TestBed.resetTestingModule();
        const armed = await setup(COMPACT_WITH_NEXT);
        const otherRoot = document.createElement('div');
        await set(armed.fixture, { scrollRoot: otherRoot });
        expect(armed.observers[0]?.disconnect).toHaveBeenCalledOnce();
        expect(armed.observers[1]?.options?.root).toBe(otherRoot);
    });

    it('nettoie observateur et écouteur de défilement à la destruction', async () => {
        const armed = await setup(COMPACT_WITH_NEXT);
        armed.fixture.destroy();
        expect(armed.observers[0]?.disconnect).toHaveBeenCalledOnce();

        TestBed.resetTestingModule();
        const waiting = await setup({ layout: 'medium', mobileHasNext: true });
        await set(waiting.fixture, { layout: 'compact' });
        const listener = waiting.addScroll.mock.calls.find(
            ([type]) => type === 'scroll'
        )?.[1];
        waiting.fixture.destroy();
        expect(waiting.removeScroll).toHaveBeenCalledWith('scroll', listener);
    });
});
