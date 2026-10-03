import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
    AccordionContent,
    AccordionGroup,
    AccordionPanel,
    AccordionTrigger,
} from '@angular/aria/accordion';
import { Menu, MenuContent, MenuItem } from '@angular/aria/menu';
import {
    Component,
    DestroyRef,
    ElementRef,
    Injector,
    afterNextRender,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import type { ProfileOption } from '../../generated/page_6666666666666666/angular/src/nodes/profiles-select/models';

export type PageLayout = 'compact' | 'medium' | 'expanded';
export type SecondaryFiltersModel = {
    profile: string;
    role: string;
    status: string;
};
export type SecondaryFilterKey = keyof SecondaryFiltersModel;

const FILTER_KEYS: readonly SecondaryFilterKey[] = [
    'profile',
    'role',
    'status',
];
const EMPTY_FILTERS: SecondaryFiltersModel = {
    profile: '',
    role: '',
    status: '',
};

@Component({
    imports: [
        AccordionContent,
        AccordionGroup,
        AccordionPanel,
        AccordionTrigger,
        CdkConnectedOverlay,
        CdkOverlayOrigin,
        CdkTrapFocus,
        FormField,
        Menu,
        MenuContent,
        MenuItem,
    ],
    selector: 'app-page-filters',
    styleUrl: './page.filters.component.scss',
    templateUrl: './page.filters.component.html',
})
export class PageFiltersComponent {
    readonly layout = input.required<PageLayout>();
    readonly open = input.required<boolean>();
    readonly applied = input.required<SecondaryFiltersModel>();
    readonly profiles = input.required<readonly ProfileOption[]>();
    readonly closed = output<void>();
    readonly filtersApplied = output<SecondaryFiltersModel>();

    private readonly destroyRef = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private readonly panel = viewChild<ElementRef<HTMLElement>>('filterPanel');
    private progressiveFilterFocusFrame: number | undefined;
    private wasOpen = false;

    protected readonly draft = signal<SecondaryFiltersModel>({
        ...EMPTY_FILTERS,
    });
    protected readonly filtersForm = form(this.draft);
    protected readonly compactDetail = signal<SecondaryFilterKey | null>(null);
    protected readonly activeProgressiveFilters = signal<
        readonly SecondaryFilterKey[]
    >([]);
    protected readonly expandedProgressiveFilters = signal<
        readonly SecondaryFilterKey[]
    >([]);
    protected readonly addMenuOpen = signal(false);
    protected readonly modal = computed(
        () => this.open() && this.layout() === 'compact'
    );
    protected readonly progressiveFilterKeys = computed(() => {
        const active = new Set(this.activeProgressiveFilters());
        const draft = this.draft();
        for (const key of FILTER_KEYS) if (draft[key]) active.add(key);
        return FILTER_KEYS.filter((key) => active.has(key));
    });
    protected readonly availableFilters = computed(() => {
        const active = new Set(this.progressiveFilterKeys());
        return FILTER_KEYS.filter((key) => !active.has(key));
    });

    constructor() {
        let boundsObserver: ResizeObserver | undefined;
        afterNextRender(
            {
                write: () => {
                    const root = this.filterWorkspace();
                    if (!root || typeof ResizeObserver === 'undefined') return;
                    boundsObserver = new ResizeObserver(() =>
                        this.syncPanelBounds()
                    );
                    boundsObserver.observe(root);
                },
            },
            { injector: this.injector }
        );
        effect(() => {
            const open = this.open();
            this.layout();
            const applied = this.applied();
            if (open && !this.wasOpen) {
                const appliedKeys = FILTER_KEYS.filter((key) => !!applied[key]);
                this.draft.set({ ...applied });
                this.activeProgressiveFilters.set(appliedKeys);
                this.expandedProgressiveFilters.set(appliedKeys);
                this.compactDetail.set(null);
                this.focusAfterRender(() => this.panel()?.nativeElement);
            }
            if (!open && this.wasOpen) this.resetTransientState();
            this.wasOpen = open;
            afterNextRender(
                { write: () => this.syncPanelBounds() },
                { injector: this.injector }
            );
        });
        this.destroyRef.onDestroy(() => {
            boundsObserver?.disconnect();
            this.cancelProgressiveFilterFocus();
        });
    }

    protected requestClose(): void {
        this.closed.emit();
    }

    protected onPanelKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || !this.modal()) return;
        event.preventDefault();
        this.requestClose();
    }

    protected showCompactFilter(key: SecondaryFilterKey): void {
        this.compactDetail.set(key);
        this.activeProgressiveFilters.update((keys) =>
            keys.includes(key) ? keys : [...keys, key]
        );
        this.expandedProgressiveFilters.update((keys) =>
            keys.includes(key) ? keys : [...keys, key]
        );
        this.focusPanelElement('[data-cmz-filter-detail-control]');
    }

    protected showCompactSummary(): void {
        const detail = this.compactDetail();
        this.compactDetail.set(null);
        if (detail) {
            this.focusPanelElement(`[data-cmz-filter-summary="${detail}"]`);
        }
    }

    protected setDraftStatus(status: string): void {
        this.draft.update((filters) => ({ ...filters, status }));
    }

    protected resetDraft(): void {
        this.draft.set({ ...EMPTY_FILTERS });
    }

    protected addProgressiveFilter(key: SecondaryFilterKey | undefined): void {
        if (!key || this.progressiveFilterKeys().includes(key)) return;
        this.addMenuOpen.set(false);
        this.activeProgressiveFilters.update((keys) => [...keys, key]);
        this.expandedProgressiveFilters.update((keys) => [...keys, key]);
        this.focusPanelElementAfterStateChange(
            `[data-cmz-filter-block="${key}"] [data-cmz-filter-control]`
        );
    }

    protected toggleAddMenu(): void {
        if (!this.addMenuOpen()) this.cancelProgressiveFilterFocus();
        this.addMenuOpen.update((open) => !open);
    }

    protected closeAddMenu(): void {
        this.addMenuOpen.set(false);
    }

    protected onAddMenuKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        this.closeAddMenu();
        this.focusPanelElement('[data-cmz-id="add-filter-trigger"]');
    }

    protected removeProgressiveFilter(key: SecondaryFilterKey): void {
        const keys = this.progressiveFilterKeys();
        const index = keys.indexOf(key);
        const focusKey = index > 0 ? keys[index - 1] : keys[index + 1];
        this.draft.update((filters) => ({ ...filters, [key]: '' }));
        this.activeProgressiveFilters.update((active) =>
            active.filter((candidate) => candidate !== key)
        );
        this.expandedProgressiveFilters.update((expanded) =>
            expanded.filter((candidate) => candidate !== key)
        );
        this.focusPanelElementAfterStateChange(
            focusKey
                ? `[data-cmz-filter-block="${focusKey}"] [ngAccordionTrigger]`
                : '[data-cmz-id="add-filter-trigger"]'
        );
    }

    protected setProgressiveFilterExpanded(
        key: SecondaryFilterKey,
        expanded: boolean
    ): void {
        this.expandedProgressiveFilters.update((keys) => {
            const next = new Set(keys);
            if (expanded) next.add(key);
            else next.delete(key);
            return FILTER_KEYS.filter((candidate) => next.has(candidate));
        });
    }

    protected isProgressiveFilterExpanded(key: SecondaryFilterKey): boolean {
        return this.expandedProgressiveFilters().includes(key);
    }

    protected filterLabel(key: SecondaryFilterKey): string {
        if (key === 'profile') return 'Profil';
        if (key === 'role') return 'Rôle';
        return 'Statut';
    }

    protected draftValue(key: SecondaryFilterKey): string {
        const value = this.draft()[key];
        if (!value) return 'Tous';
        if (key === 'profile') {
            return (
                this.profiles().find((profile) => profile.value === value)
                    ?.label ?? value
            );
        }
        return key === 'role' ? this.roleLabel(value) : this.statusLabel(value);
    }

    protected submit(event: Event): void {
        event.preventDefault();
        this.filtersApplied.emit({ ...this.draft() });
    }

    private resetTransientState(): void {
        this.activeProgressiveFilters.set([]);
        this.expandedProgressiveFilters.set([]);
        this.addMenuOpen.set(false);
        this.compactDetail.set(null);
        this.cancelProgressiveFilterFocus();
    }

    private statusLabel(status: string): string {
        if (status === 'active') return 'Actif';
        if (status === 'inactive') return 'Inactif';
        return status;
    }

    private roleLabel(role: string): string {
        const labels: Readonly<Record<string, string>> = {
            agent: 'Agent',
            supervisor: 'Superviseur',
            'team-leader': 'Chef d’équipe',
        };
        return labels[role] ?? role;
    }

    private filterWorkspace(): HTMLElement | null {
        return this.host.nativeElement.closest<HTMLElement>(
            '[data-cmz-id="users-table-workspace"]'
        );
    }

    private syncPanelBounds(): void {
        const root = this.filterWorkspace();
        const table = root?.querySelector<HTMLElement>(
            '[data-cmz-id="users-table"]'
        );
        const rail = root?.querySelector<HTMLElement>(
            '[data-cmz-id="table-horizontal-scroll"]'
        );
        if (!root) return;
        if (!this.open() || this.layout() === 'compact' || !table || !rail) {
            root.style.removeProperty('--filter-panel-top');
            root.style.removeProperty('--filter-panel-bottom');
            return;
        }
        const rootBox = root.getBoundingClientRect();
        root.style.setProperty(
            '--filter-panel-top',
            `${Math.max(0, table.getBoundingClientRect().top - rootBox.top)}px`
        );
        root.style.setProperty(
            '--filter-panel-bottom',
            `${Math.max(0, rootBox.bottom - rail.getBoundingClientRect().top)}px`
        );
    }

    private focusAfterRender(
        resolve: () => HTMLElement | null | undefined
    ): void {
        afterNextRender(
            { write: () => resolve()?.focus() },
            { injector: this.injector }
        );
    }

    private focusPanelElement(selector: string): void {
        this.focusAfterRender(() =>
            this.panel()?.nativeElement.querySelector<HTMLElement>(selector)
        );
    }

    private focusPanelElementAfterStateChange(selector: string): void {
        this.cancelProgressiveFilterFocus();
        afterNextRender(
            {
                write: () => {
                    this.progressiveFilterFocusFrame = requestAnimationFrame(
                        () => {
                            this.progressiveFilterFocusFrame = undefined;
                            this.panel()
                                ?.nativeElement.querySelector<HTMLElement>(
                                    selector
                                )
                                ?.focus();
                        }
                    );
                },
            },
            { injector: this.injector }
        );
    }

    private cancelProgressiveFilterFocus(): void {
        if (this.progressiveFilterFocusFrame === undefined) return;
        cancelAnimationFrame(this.progressiveFilterFocusFrame);
        this.progressiveFilterFocusFrame = undefined;
    }
}
