import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
    Component,
    ElementRef,
    Injector,
    afterNextRender,
    afterRenderEffect,
    computed,
    inject,
    linkedSignal,
    signal,
    viewChild,
    type Provider,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { map, tap } from 'rxjs';

import {
    PAGE_ACTION_PERMISSION_PORT,
    PAGE_COMPOSITION_PROVIDERS,
    PageComposition,
    type PageActionPermissionPort,
} from '../../generated/page_6666666666666666/angular/src';
import type { UserListItem } from '../../generated/page_6666666666666666/angular/src/nodes/users-list/models';
import { APP_ACCESS_DECISION } from '../../access.guard';
import { PageCreateComponent } from './page.create.component';
import {
    PageFiltersComponent,
    type PageLayout,
    type SecondaryFiltersModel,
} from './page.filters.component';
import {
    PageResultsComponent,
    type FilterShortcut,
} from './page.results.component';
interface SearchSelection {
    readonly start: number | null;
    readonly end: number | null;
    readonly direction: 'forward' | 'backward' | 'none';
}
const EMPTY_SEARCH = {
    search: '',
};
const EMPTY_FILTERS: SecondaryFiltersModel = {
    profile: '',
    role: '',
    status: '',
};
export const PAGE_COMPACT_MEDIA_QUERY = '(max-width: 800px)';
export const PAGE_EXPANDED_MEDIA_QUERY =
    '(min-width: 1200px) and (min-height: 800px)';
interface MobilePageRequest {
    readonly attempt: number;
    readonly generation: number;
    readonly pageNumber: number;
}
interface MobileProjection {
    readonly announcement: string;
    readonly failedRequestKey?: string;
    readonly generation: number;
    readonly lastPage: number;
    readonly pages: ReadonlyMap<number, readonly UserListItem[]>;
    readonly settledRequestKey?: string;
    readonly totalItems: number;
}
const EMPTY_MOBILE_PROJECTION: MobileProjection = {
    announcement: '',
    generation: 0,
    lastPage: 1,
    pages: new Map(),
    totalItems: 0,
};
function mobileRequestKey(request: MobilePageRequest): string {
    return `${request.generation}:${request.pageNumber}:${request.attempt}`;
}
function flattenMobilePages(
    pages: ReadonlyMap<number, readonly UserListItem[]>
): readonly UserListItem[] {
    const result: UserListItem[] = [];
    const seen = new Set<string>();
    for (let pageNumber = 1; pages.has(pageNumber); pageNumber += 1) {
        for (const user of pages.get(pageNumber) ?? []) {
            if (seen.has(user.uniqId)) continue;
            seen.add(user.uniqId);
            result.push(user);
        }
    }
    return result;
}
function permissionPortFactory(): PageActionPermissionPort {
    const decision = inject(APP_ACCESS_DECISION, { optional: true });
    return {
        has: (permission: string) =>
            computed(() => decision?.hasPermission(permission) ?? false),
    };
}

export const PAGE_PERMISSION_PROVIDER: Provider = {
    provide: PAGE_ACTION_PERMISSION_PORT,
    useFactory: permissionPortFactory,
};

@Component({
    imports: [
        FormField,
        NgTemplateOutlet,
        PageCreateComponent,
        PageFiltersComponent,
        PageResultsComponent,
    ],
    providers: [...PAGE_COMPOSITION_PROVIDERS, PAGE_PERMISSION_PROVIDER],
    selector: 'app-page-66666666',
    styleUrl: './page.component.scss',
    templateUrl: './page.component.html',
})
export class PageComponent {
    protected readonly composition = inject(PageComposition);
    private readonly breakpointObserver = inject(BreakpointObserver);
    private readonly injector = inject(Injector);
    private readonly createButton =
        viewChild<ElementRef<HTMLButtonElement>>('createButton');
    private readonly filterTrigger =
        viewChild<ElementRef<HTMLButtonElement>>('filterTrigger');
    private readonly searchInput =
        viewChild<ElementRef<HTMLInputElement>>('searchInput');
    private pendingSearchSelection: SearchSelection | null = null;
    private pendingCreateFocus = false;

    protected readonly layout = toSignal(
        this.breakpointObserver
            .observe([PAGE_COMPACT_MEDIA_QUERY, PAGE_EXPANDED_MEDIA_QUERY])
            .pipe(
                tap(() => {
                    this.captureSearchSelection();
                    this.pendingCreateFocus =
                        document.activeElement ===
                        this.createButton()?.nativeElement;
                }),
                map(({ breakpoints }): PageLayout => {
                    if (breakpoints[PAGE_COMPACT_MEDIA_QUERY]) return 'compact';
                    if (breakpoints[PAGE_EXPANDED_MEDIA_QUERY])
                        return 'expanded';
                    return 'medium';
                })
            ),
        { initialValue: 'medium' as PageLayout }
    );

    // La recherche suit les commandes en Compact et les précède ailleurs : le
    // DOM garde ainsi l'ordre visuel (LAY-05). Pendant une composition (touches
    // mortes, IME), le champ ne bouge pas : le déplacer casserait la saisie.
    private readonly searchComposing = signal(false);
    protected readonly searchAfterCommands = linkedSignal<
        { compact: boolean; composing: boolean },
        boolean
    >({
        source: () => ({
            compact: this.layout() === 'compact',
            composing: this.searchComposing(),
        }),
        computation: (source, previous) =>
            source.composing && previous ? previous.value : source.compact,
    });

    protected readonly searchModel = signal({ ...EMPTY_SEARCH });
    protected readonly searchForm = form(this.searchModel);
    // Seule la recherche soumise filtre la liste : pagination, rafraîchissement
    // et chargement progressif n'appliquent jamais le brouillon du champ.
    private readonly appliedSearch = signal('');
    protected readonly appliedFilters = signal<SecondaryFiltersModel>({
        ...EMPTY_FILTERS,
    });
    protected readonly areFiltersOpen = signal(false);
    protected readonly isModalFilters = computed(
        () => this.areFiltersOpen() && this.layout() === 'compact'
    );
    protected readonly activeSecondaryFilterCount = computed(() => {
        const filters = this.appliedFilters();
        return [filters.profile, filters.role, filters.status].filter(Boolean)
            .length;
    });
    protected readonly filterTriggerLabel = computed(() => {
        const count = this.activeSecondaryFilterCount();
        return count ? `Filtres (${count})` : 'Filtres';
    });
    protected readonly isCreateOpen = signal(false);
    protected readonly successNotice = signal('');

    protected readonly users = this.composition.usersList.items;
    protected readonly profiles = this.composition.profilesSelect.items;
    protected readonly page = this.composition.usersList.page;
    protected readonly usersState = this.composition.usersList.state;
    protected readonly profilesState = this.composition.profilesSelect.state;
    protected readonly totalUsers = computed(
        () => this.page()?.totalItems ?? 0
    );
    protected readonly totalUsersLabel = computed(() => {
        const total = this.totalUsers();
        return `${total} utilisateur${total > 1 ? 's' : ''} au total`;
    });
    private readonly mobileGeneration = signal(0);
    private readonly mobileRequest = signal<MobilePageRequest | null>(null);
    protected readonly mobileProjection = linkedSignal({
        source: () => ({
            generation: this.mobileGeneration(),
            page: this.page(),
            request: this.mobileRequest(),
            state: this.usersState(),
        }),
        computation: (source, previous): MobileProjection => {
            const current =
                previous?.value.generation === source.generation
                    ? previous.value
                    : {
                          ...EMPTY_MOBILE_PROJECTION,
                          generation: source.generation,
                      };
            const request = source.request;
            if (!request || request.generation !== source.generation) {
                return current;
            }

            const requestKey = mobileRequestKey(request);
            if (source.state === 'error') {
                return current.failedRequestKey === requestKey
                    ? current
                    : { ...current, failedRequestKey: requestKey };
            }
            if (source.state !== 'success' && source.state !== 'empty') {
                return current;
            }
            if (
                !source.page ||
                source.page.currentPage !== request.pageNumber ||
                current.settledRequestKey === requestKey
            ) {
                return current;
            }

            const before = flattenMobilePages(current.pages);
            const pages =
                request.pageNumber === 1
                    ? new Map<number, readonly UserListItem[]>()
                    : new Map(current.pages);
            pages.set(request.pageNumber, source.page.items);
            const added = Math.max(
                0,
                flattenMobilePages(pages).length -
                    (request.pageNumber === 1 ? 0 : before.length)
            );
            return {
                announcement:
                    request.pageNumber > 1 && added > 0
                        ? `${added} utilisateur${added > 1 ? 's' : ''} supplémentaire${added > 1 ? 's' : ''}.`
                        : '',
                generation: source.generation,
                lastPage: source.page.lastPage,
                pages,
                settledRequestKey: requestKey,
                totalItems: source.page.totalItems,
            };
        },
    });
    protected readonly mobileUsers = computed(() =>
        flattenMobilePages(this.mobileProjection().pages)
    );
    private readonly mobileLastLoadedPage = computed(() => {
        const pages = this.mobileProjection().pages;
        let pageNumber = 0;
        while (pages.has(pageNumber + 1)) pageNumber += 1;
        return pageNumber;
    });
    protected readonly mobileHasNext = computed(() => {
        const projection = this.mobileProjection();
        const lastLoaded = this.mobileLastLoadedPage();
        return lastLoaded > 0 && lastLoaded < projection.lastPage;
    });
    protected readonly mobileLoadingNext = computed(() => {
        const request = this.mobileRequest();
        if (!request || request.pageNumber <= 1) return false;
        const projection = this.mobileProjection();
        const key = mobileRequestKey(request);
        return (
            projection.settledRequestKey !== key &&
            projection.failedRequestKey !== key
        );
    });
    protected readonly mobileFailedPage = computed(() => {
        const request = this.mobileRequest();
        if (!request || request.pageNumber <= 1) return null;
        return this.mobileProjection().failedRequestKey ===
            mobileRequestKey(request)
            ? request.pageNumber
            : null;
    });
    protected readonly isInitialLoading = computed(
        () =>
            this.users().length === 0 &&
            (this.usersState() === 'idle' || this.usersState() === 'loading')
    );
    protected readonly isReloading = computed(
        () => this.usersState() === 'reloading'
    );
    protected readonly hasQueryError = computed(
        () =>
            this.profilesState() === 'error' ||
            (this.usersState() === 'error' &&
                (this.layout() !== 'compact' || !this.mobileFailedPage()))
    );
    protected readonly isEmpty = computed(
        () => this.usersState() === 'empty' && this.users().length === 0
    );
    constructor() {
        this.composition.profilesSelect.load();
        this.resetMobileProjection();
        // Le champ et, en Compact, le bouton Créer changent de place : ce sont
        // de nouvelles instances, dont le focus et la sélection sont restitués.
        // L'historique d'annulation du champ, lui, est perdu.
        afterRenderEffect({
            write: () => {
                this.layout();
                this.searchAfterCommands();
                if (this.pendingCreateFocus) {
                    this.pendingCreateFocus = false;
                    this.createButton()?.nativeElement.focus({
                        preventScroll: true,
                    });
                }
                const selection = this.pendingSearchSelection;
                this.pendingSearchSelection = null;
                const input = this.searchInput()?.nativeElement;
                if (!selection || !input || document.activeElement === input)
                    return;
                input.focus({ preventScroll: true });
                input.setSelectionRange(
                    selection.start,
                    selection.end,
                    selection.direction
                );
            },
        });
    }

    protected onSearchCompositionStart(): void {
        this.searchComposing.set(true);
    }

    protected onSearchCompositionEnd(): void {
        if (this.searchAfterCommands() !== (this.layout() === 'compact')) {
            this.captureSearchSelection();
        }
        this.searchComposing.set(false);
    }

    private captureSearchSelection(): void {
        const input = this.searchInput()?.nativeElement;
        this.pendingSearchSelection =
            input && document.activeElement === input
                ? {
                      start: input.selectionStart,
                      end: input.selectionEnd,
                      direction: input.selectionDirection ?? 'none',
                  }
                : null;
    }

    protected applySearch(event: Event): void {
        event.preventDefault();
        this.appliedSearch.set(this.searchModel().search.trim());
        this.resetMobileProjection();
    }

    protected refreshUsers(): void {
        if (this.layout() === 'compact') {
            this.resetMobileProjection();
            return;
        }
        this.loadUsers(this.page()?.currentPage ?? 1);
    }

    protected toggleFilters(): void {
        if (this.areFiltersOpen()) {
            this.closeFilters();
            return;
        }
        this.areFiltersOpen.set(true);
    }

    protected closeFilters(): void {
        this.areFiltersOpen.set(false);
        this.restoreFilterTriggerFocus();
    }

    protected applyFilterShortcut({ key, value }: FilterShortcut): void {
        this.appliedFilters.update((filters) => ({
            ...filters,
            [key]: value,
        }));
        this.resetMobileProjection();
    }

    protected applyFilters(filters: SecondaryFiltersModel): void {
        this.appliedFilters.set(filters);
        this.areFiltersOpen.set(false);
        this.resetMobileProjection();
        this.restoreFilterTriggerFocus();
    }

    protected goToPage(page: number): void {
        if (page < 1 || page > (this.page()?.lastPage ?? 1)) return;
        this.loadUsers(page);
    }

    protected openCreateForm(): void {
        if (!this.composition.createUser.authorized()) return;
        this.isCreateOpen.set(true);
    }

    protected onCreateClosed(): void {
        this.isCreateOpen.set(false);
        this.restoreCreateButtonFocus();
    }

    protected onUserCreated(): void {
        this.successNotice.set("L'utilisateur a été créé.");
        this.isCreateOpen.set(false);
        this.resetMobileProjection();
        this.restoreCreateButtonFocus();
    }

    protected retryMobilePage(): void {
        const request = this.mobileRequest();
        if (!request || this.mobileFailedPage() !== request.pageNumber) return;
        const retry = { ...request, attempt: request.attempt + 1 };
        this.mobileRequest.set(retry);
        this.loadUsers(retry.pageNumber);
    }

    protected loadNextMobilePage(): void {
        if (
            this.layout() !== 'compact' ||
            !this.mobileHasNext() ||
            this.mobileLoadingNext() ||
            this.mobileFailedPage()
        ) {
            return;
        }
        const request: MobilePageRequest = {
            attempt: 0,
            generation: this.mobileGeneration(),
            pageNumber: this.mobileLastLoadedPage() + 1,
        };
        this.mobileRequest.set(request);
        this.loadUsers(request.pageNumber);
    }

    private resetMobileProjection(): void {
        const generation = this.mobileGeneration() + 1;
        this.mobileGeneration.set(generation);
        this.mobileRequest.set({ attempt: 0, generation, pageNumber: 1 });
        this.loadUsers(1);
    }

    private loadUsers(page: number): void {
        const filters = this.appliedFilters();
        const search = this.appliedSearch();
        this.composition.usersList.load({
            page,
            ...(search ? { search } : {}),
            ...(filters.profile ? { profile: filters.profile } : {}),
            ...(filters.role ? { role: filters.role } : {}),
            ...(filters.status
                ? { isActive: filters.status === 'active' }
                : {}),
        });
    }

    private focusAfterRender(
        resolve: () => HTMLElement | null | undefined
    ): void {
        afterNextRender(
            { write: () => resolve()?.focus() },
            { injector: this.injector }
        );
    }

    private restoreCreateButtonFocus(): void {
        this.focusAfterRender(() => this.createButton()?.nativeElement);
    }

    private restoreFilterTriggerFocus(): void {
        this.focusAfterRender(() => this.filterTrigger()?.nativeElement);
    }
}
