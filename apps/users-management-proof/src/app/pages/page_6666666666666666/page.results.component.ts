import {
    Component,
    ElementRef,
    afterRenderEffect,
    computed,
    inject,
    input,
    linkedSignal,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
    MatSort,
    MatSortHeader,
    type Sort,
    type SortDirection,
} from '@angular/material/sort';

import type { ProfileOption } from '../../generated/page_6666666666666666/angular/src/nodes/profiles-select/models';
import type {
    ListUsersPage,
    UserListItem,
} from '../../generated/page_6666666666666666/angular/src/nodes/users-list/models';
import type {
    PageLayout,
    SecondaryFilterKey,
    SecondaryFiltersModel,
} from './page.filters.component';

export interface FilterShortcut {
    readonly key: SecondaryFilterKey;
    readonly value: string;
}

const SORT_COLUMNS = [
    'lastName',
    'firstName',
    'email',
    'profile',
    'role',
    'status',
    'updatedAt',
] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];
type ActiveSortDirection = Exclude<SortDirection, ''>;

interface ActiveSort {
    readonly column: SortColumn;
    readonly direction: ActiveSortDirection;
}

type DateSortKey =
    | { readonly kind: 'valid'; readonly epoch: number }
    | { readonly kind: 'invalid'; readonly raw: string }
    | { readonly kind: 'absent' };

const SORT_LABELS: Readonly<Record<SortColumn, string>> = {
    lastName: 'Nom',
    firstName: 'Prénom',
    email: 'Email',
    profile: 'Profil',
    role: 'Rôle',
    status: 'Statut',
    updatedAt: 'Mise à jour',
};

const FRENCH_COLLATOR = new Intl.Collator('fr', {
    sensitivity: 'accent',
    usage: 'sort',
});

// Vue de la collection d'utilisateurs : ses quatre états (chargement, vide,
// erreur avec données conservées, prêt), ses deux rendus (tableau, cartes), la
// pagination, les raccourcis de colonne et le déclenchement visuel du
// chargement progressif. Elle ne charge rien : elle émet des intentions, la
// page garde requêtes, filtres appliqués, génération et projection des pages.
@Component({
    host: {
        '[class.filters-open]': 'filtersOpen()',
        '[class.layout-compact]': "layout() === 'compact'",
    },
    imports: [MatSort, MatSortHeader],
    selector: 'app-page-results',
    styleUrl: './page.results.component.scss',
    templateUrl: './page.results.component.html',
})
export class PageResultsComponent {
    private readonly liveAnnouncer = inject(LiveAnnouncer);

    readonly layout = input.required<PageLayout>();
    readonly filtersOpen = input.required<boolean>();
    readonly loading = input.required<boolean>();
    readonly empty = input.required<boolean>();
    readonly queryFailed = input.required<boolean>();
    readonly reloading = input.required<boolean>();
    readonly page = input.required<ListUsersPage | undefined>();
    readonly profiles = input.required<readonly ProfileOption[]>();
    readonly appliedFilters = input.required<SecondaryFiltersModel>();
    readonly mobileUsers = input.required<readonly UserListItem[]>();
    readonly mobileHasNext = input.required<boolean>();
    readonly mobileLoadingNext = input.required<boolean>();
    readonly mobileFailed = input.required<boolean>();
    readonly mobileAnnouncement = input.required<string>();
    // Change à chaque nouvelle première page : réarme le chargement anticipé.
    readonly loadGeneration = input.required<number>();
    // Conteneur défilant de la page, racine de l'observateur d'intersection.
    readonly scrollRoot = input.required<HTMLElement>();

    readonly filterShortcutApplied = output<FilterShortcut>();
    readonly pageRequested = output<number>();
    readonly mobileRetryRequested = output<void>();
    readonly mobileNextRequested = output<void>();

    private readonly sentinel =
        viewChild<ElementRef<HTMLElement>>('mobileLoadSentinel');
    // Vrai entre l'émission de la demande et sa prise en charge par la page.
    // Toute transition du cycle externe — chargement, échec, génération — le
    // remet à faux : aucune temporisation ne gouverne la reprise.
    private readonly nextRequested = linkedSignal({
        source: () => ({
            loading: this.mobileLoadingNext(),
            failed: this.mobileFailed(),
            generation: this.loadGeneration(),
        }),
        computation: () => false,
    });
    // RESP-02 : entrer en Compact par un changement de classe ne charge rien.
    // Le chargement anticipé (ADR-0075) reprend au premier défilement vers le
    // bas, ou à la génération de données suivante.
    private readonly autoLoadArmed = linkedSignal<
        { compact: boolean; generation: number },
        boolean
    >({
        source: () => ({
            compact: this.layout() === 'compact',
            generation: this.loadGeneration(),
        }),
        computation: (source, previous) => {
            if (!previous) return true;
            if (source.generation !== previous.source.generation) return true;
            if (source.compact && !previous.source.compact) return false;
            return previous.value;
        },
    });

    protected readonly users = computed<readonly UserListItem[]>(
        () => this.page()?.items ?? []
    );
    protected readonly activeSort = signal<ActiveSort | null>(null);
    protected readonly sortedUsers = computed<readonly UserListItem[]>(() => {
        const users = this.users();
        const sort = this.activeSort();
        if (!sort) return users;

        return users
            .map((user, receivedIndex) => ({ receivedIndex, user }))
            .sort((left, right) => {
                const comparison = this.compareUsers(
                    left.user,
                    right.user,
                    sort
                );
                return comparison || left.receivedIndex - right.receivedIndex;
            })
            .map(({ user }) => user);
    });
    protected readonly ready = computed(() => this.users().length > 0);
    protected readonly showSentinel = computed(
        () =>
            this.mobileHasNext() ||
            this.mobileLoadingNext() ||
            this.mobileFailed()
    );
    protected readonly canGoPrevious = computed(
        () => (this.page()?.currentPage ?? 1) > 1 && !this.reloading()
    );
    protected readonly canGoNext = computed(() => {
        const page = this.page();
        return !!page && page.currentPage < page.lastPage && !this.reloading();
    });
    protected readonly resultRange = computed(() => {
        const page = this.page();
        if (!page || page.totalItems === 0) return '0 utilisateur';
        const first = (page.currentPage - 1) * page.pageSize + 1;
        const last = Math.min(first + page.items.length - 1, page.totalItems);
        return `${first}–${last} sur ${page.totalItems} utilisateurs`;
    });
    protected readonly paginationPages = computed(() => {
        const page = this.page();
        if (!page || page.lastPage < 1) return [];
        if (page.lastPage === 1) return [1];
        const first = Math.min(
            Math.max(page.currentPage - 1, 1),
            page.lastPage - 1
        );
        return [first, first + 1];
    });

    constructor() {
        afterRenderEffect({
            read: (onCleanup) => {
                // Lu à chaque passe, y compris hors Compact : un signal lié
                // n'est évalué qu'à la lecture, et la transition de
                // disposition qui désarme serait sinon perdue.
                const armed = this.autoLoadArmed();
                const sentinel = this.sentinel()?.nativeElement;
                if (
                    this.layout() !== 'compact' ||
                    !sentinel ||
                    !this.mobileHasNext() ||
                    this.mobileLoadingNext() ||
                    this.mobileFailed() ||
                    this.nextRequested()
                ) {
                    return;
                }
                const root = this.scrollRoot();
                if (!armed) {
                    const top = sentinel.getBoundingClientRect().top;
                    const arm = () => {
                        if (sentinel.getBoundingClientRect().top < top - 1) {
                            this.autoLoadArmed.set(true);
                        }
                    };
                    root.addEventListener('scroll', arm, { passive: true });
                    onCleanup(() => root.removeEventListener('scroll', arm));
                    return;
                }
                const observer = new IntersectionObserver(
                    (entries) => {
                        if (entries.some((entry) => entry.isIntersecting)) {
                            this.requestNextMobilePage();
                        }
                    },
                    {
                        root,
                        rootMargin: '0px 0px 150% 0px',
                        threshold: 0,
                    }
                );
                observer.observe(sentinel);
                onCleanup(() => observer.disconnect());
            },
        });
    }

    protected applyShortcut(key: SecondaryFilterKey, event: Event): void {
        this.filterShortcutApplied.emit({
            key,
            value: (event.target as HTMLSelectElement).value,
        });
    }

    protected sortChanged(sort: Sort): void {
        if (!this.isSortColumn(sort.active)) {
            throw new Error(
                `Colonne de tri non prise en charge : ${sort.active}`
            );
        }

        if (sort.direction === '') {
            this.activeSort.set(null);
            void this.liveAnnouncer.announce(
                'Ordre reçu rétabli pour les lignes affichées',
                'polite'
            );
            return;
        }

        this.activeSort.set({
            column: sort.active,
            direction: sort.direction,
        });
        const direction =
            sort.direction === 'asc' ? 'croissant' : 'décroissant';
        void this.liveAnnouncer.announce(
            `Lignes affichées triées par ${SORT_LABELS[sort.active]}, ordre ${direction}`,
            'polite'
        );
    }

    protected sortActionDescription(column: SortColumn): string {
        const sort = this.activeSort();
        if (!sort || sort.column !== column) {
            return `Trier les lignes affichées par ${SORT_LABELS[column]}, ordre croissant`;
        }
        if (sort.direction === 'asc') {
            return `Tri croissant actif. Trier les lignes affichées par ${SORT_LABELS[column]}, ordre décroissant`;
        }
        return 'Tri décroissant actif. Rétablir l’ordre reçu pour les lignes affichées';
    }

    protected revealFocusedSortHeader(event: FocusEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const header = target.closest<HTMLElement>('th[mat-sort-header]');
        header?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    protected retryMobilePage(): void {
        this.mobileRetryRequested.emit();
    }

    protected statusLabel(status: string): string {
        const normalized = status.toLowerCase();
        if (normalized === 'active' || normalized === 'actif') return 'Actif';
        if (normalized === 'inactive' || normalized === 'inactif')
            return 'Inactif';
        return status;
    }

    protected isActiveStatus(status: string): boolean {
        return ['active', 'actif'].includes(status.toLowerCase());
    }

    protected roleLabel(role: string | null | undefined): string {
        const value = role?.trim() ?? '';
        const labels: Readonly<Record<string, string>> = {
            agent: 'Agent',
            supervisor: 'Superviseur',
            'team-leader': 'Chef d’équipe',
        };
        return labels[value.toLowerCase()] ?? (value || 'Sans rôle');
    }

    protected formatDate(value: string): string {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? value
            : new Intl.DateTimeFormat('fr-FR').format(date);
    }

    protected rowRank(index: number): number {
        const currentPage = this.page()?.currentPage ?? 1;
        const pageSize = this.page()?.pageSize ?? this.users().length;
        return (currentPage - 1) * pageSize + index + 1;
    }

    private isSortColumn(value: string): value is SortColumn {
        return SORT_COLUMNS.includes(value as SortColumn);
    }

    private compareUsers(
        left: UserListItem,
        right: UserListItem,
        sort: ActiveSort
    ): number {
        switch (sort.column) {
            case 'lastName':
            case 'firstName':
            case 'email':
            case 'profile':
                return this.compareText(
                    left[sort.column],
                    right[sort.column],
                    sort.direction
                );
            case 'role':
                return this.compareText(
                    this.presentText(left.role)
                        ? this.roleLabel(left.role)
                        : null,
                    this.presentText(right.role)
                        ? this.roleLabel(right.role)
                        : null,
                    sort.direction
                );
            case 'status':
                return this.compareText(
                    this.presentText(left.status)
                        ? this.statusLabel(left.status)
                        : null,
                    this.presentText(right.status)
                        ? this.statusLabel(right.status)
                        : null,
                    sort.direction
                );
            case 'updatedAt':
                return this.compareDates(
                    this.dateSortKey(left.updatedAt),
                    this.dateSortKey(right.updatedAt),
                    sort.direction
                );
        }
    }

    private compareText(
        left: string | null | undefined,
        right: string | null | undefined,
        direction: ActiveSortDirection
    ): number {
        const leftValue = this.presentText(left);
        const rightValue = this.presentText(right);
        if (leftValue === null) return rightValue === null ? 0 : 1;
        if (rightValue === null) return -1;
        return (
            FRENCH_COLLATOR.compare(leftValue, rightValue) *
            this.directionFactor(direction)
        );
    }

    private compareDates(
        left: DateSortKey,
        right: DateSortKey,
        direction: ActiveSortDirection
    ): number {
        const category = { valid: 0, invalid: 1, absent: 2 } as const;
        if (left.kind !== right.kind) {
            return category[left.kind] - category[right.kind];
        }
        if (left.kind === 'valid' && right.kind === 'valid') {
            return (
                Math.sign(left.epoch - right.epoch) *
                this.directionFactor(direction)
            );
        }
        if (left.kind === 'invalid' && right.kind === 'invalid') {
            return (
                FRENCH_COLLATOR.compare(left.raw, right.raw) *
                this.directionFactor(direction)
            );
        }
        return 0;
    }

    private presentText(value: string | null | undefined): string | null {
        const normalized = value?.trim();
        return normalized ? normalized : null;
    }

    private dateSortKey(value: string | null | undefined): DateSortKey {
        const normalized = this.presentText(value);
        if (normalized === null) return { kind: 'absent' };
        const epoch = new Date(normalized).getTime();
        return Number.isNaN(epoch)
            ? { kind: 'invalid', raw: normalized }
            : { kind: 'valid', epoch };
    }

    private directionFactor(direction: ActiveSortDirection): 1 | -1 {
        return direction === 'asc' ? 1 : -1;
    }

    // Une même intersection peut être notifiée plusieurs fois avant que la page
    // ait répercuté l'état de chargement : le verrou, posé de façon synchrone,
    // borne la demande à une seule.
    private requestNextMobilePage(): void {
        if (this.nextRequested()) return;
        this.nextRequested.set(true);
        this.mobileNextRequested.emit();
    }
}
