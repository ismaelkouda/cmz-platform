import { CdkTrapFocus } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
    Component,
    DestroyRef,
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
import {
    FormField,
    disabled,
    emailError,
    form,
    pattern,
    required,
    submit,
    validate,
} from '@angular/forms/signals';
import { firstValueFrom, map } from 'rxjs';

import {
    PAGE_ACTION_PERMISSION_PORT,
    PAGE_COMPOSITION_PROVIDERS,
    PageComposition,
    type PageActionPermissionPort,
} from '../../generated/page_6666666666666666/angular/src';
import type { UserListItem } from '../../generated/page_6666666666666666/angular/src/nodes/users-list/models';
import { APP_ACCESS_DECISION } from '../../access.guard';
type SecondaryFiltersModel = { profile: string; role: string; status: string };
type SecondaryFilterKey = keyof SecondaryFiltersModel;
interface AppliedFilterItem {
    key: SecondaryFilterKey;
    label: string;
    value: string;
}
const EMPTY_SEARCH = {
    search: '',
};
const EMPTY_FILTERS: SecondaryFiltersModel = {
    profile: '',
    role: '',
    status: '',
};
const EMPTY_USER = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileId: '',
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PAGE_COMPACT_MEDIA_QUERY = '(max-width: 800px)';
export const PAGE_EXPANDED_MEDIA_QUERY =
    '(min-width: 1200px) and (min-height: 800px)';
type PageLayout = 'compact' | 'medium' | 'expanded';
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

function messageFrom(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    const message = (error as { message?: unknown } | null)?.message;
    if (typeof message === 'string' && message.trim()) return message;
    return 'Une erreur inattendue est survenue.';
}

@Component({
    imports: [CdkTrapFocus, FormField],
    providers: [...PAGE_COMPOSITION_PROVIDERS, PAGE_PERMISSION_PROVIDER],
    selector: 'app-page-66666666',
    styleUrl: './page.component.scss',
    templateUrl: './page.component.html',
})
export class PageComponent {
    protected readonly composition = inject(PageComposition);
    private readonly breakpointObserver = inject(BreakpointObserver);
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);
    private readonly createButton =
        viewChild<ElementRef<HTMLButtonElement>>('createButton');
    private readonly lastNameInput =
        viewChild<ElementRef<HTMLInputElement>>('lastNameInput');
    private readonly filterTrigger =
        viewChild<ElementRef<HTMLButtonElement>>('filterTrigger');
    private readonly filterPanel =
        viewChild<ElementRef<HTMLElement>>('filterPanel');
    private readonly mobileLoadSentinel =
        viewChild<ElementRef<HTMLElement>>('mobileLoadSentinel');
    private readonly workspace =
        viewChild<ElementRef<HTMLElement>>('workspace');

    protected readonly layout = toSignal(
        this.breakpointObserver
            .observe([PAGE_COMPACT_MEDIA_QUERY, PAGE_EXPANDED_MEDIA_QUERY])
            .pipe(
                map(({ breakpoints }): PageLayout => {
                    if (breakpoints[PAGE_COMPACT_MEDIA_QUERY]) return 'compact';
                    if (breakpoints[PAGE_EXPANDED_MEDIA_QUERY])
                        return 'expanded';
                    return 'medium';
                })
            ),
        { initialValue: 'medium' as PageLayout }
    );

    protected readonly searchModel = signal({ ...EMPTY_SEARCH });
    protected readonly searchForm = form(this.searchModel);
    protected readonly appliedFilters = signal<SecondaryFiltersModel>({
        ...EMPTY_FILTERS,
    });
    protected readonly draftFilters = signal<SecondaryFiltersModel>({
        ...EMPTY_FILTERS,
    });
    protected readonly filtersForm = form(this.draftFilters);
    protected readonly areFiltersOpen = signal(false);
    protected readonly compactFilterDetail = signal<SecondaryFilterKey | null>(
        null
    );
    private readonly preserveFilterDraft = signal(false);
    protected readonly isModalFilters = computed(
        () => this.areFiltersOpen() && this.layout() !== 'expanded'
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
    protected readonly appliedFilterItems = computed<AppliedFilterItem[]>(
        () => {
            const filters = this.appliedFilters();
            const items: AppliedFilterItem[] = [];
            if (filters.profile) {
                items.push({
                    key: 'profile',
                    label: 'Profil',
                    value:
                        this.profiles().find(
                            (profile) => profile.value === filters.profile
                        )?.label ?? filters.profile,
                });
            }
            if (filters.role) {
                items.push({
                    key: 'role',
                    label: 'Rôle',
                    value: this.roleLabel(filters.role),
                });
            }
            if (filters.status) {
                items.push({
                    key: 'status',
                    label: 'Statut',
                    value: this.statusLabel(filters.status),
                });
            }
            return items;
        }
    );
    protected readonly visibleAppliedFilters = computed(() => {
        const limit = this.layout() === 'expanded' ? 4 : 2;
        return this.appliedFilterItems().slice(0, limit);
    });
    protected readonly hiddenAppliedFilterCount = computed(
        () =>
            this.appliedFilterItems().length -
            this.visibleAppliedFilters().length
    );
    protected readonly createModel = signal({ ...EMPTY_USER });
    protected readonly isCreateOpen = signal(false);
    protected readonly isDiscardConfirmOpen = signal(false);
    protected readonly invalidCreateAttempt = signal(false);
    protected readonly successNotice = signal('');
    protected readonly failureNotice = signal('');
    protected readonly emailConflict = signal(false);
    private createReturnFocus: HTMLElement | null = null;

    protected readonly isSubmitting = computed(
        () => this.composition.createUser.state() === 'submitting'
    );
    protected readonly createForm = form(this.createModel, (schema) => {
        required(schema.firstName, { message: 'Le prénom est obligatoire.' });
        required(schema.lastName, { message: 'Le nom est obligatoire.' });
        required(schema.email, { message: "L'adresse email est obligatoire." });
        required(schema.phone, { message: 'Le téléphone est obligatoire.' });
        required(schema.profileId, { message: 'Le profil est obligatoire.' });
        pattern(schema.firstName, /\S/, {
            message: 'Le prénom est obligatoire.',
        });
        pattern(schema.lastName, /\S/, {
            message: 'Le nom est obligatoire.',
        });
        pattern(schema.phone, /\S/, {
            message: 'Le téléphone est obligatoire.',
        });
        validate(schema.email, ({ value }) => {
            const email = value().trim();
            return !email || EMAIL_PATTERN.test(email)
                ? undefined
                : emailError({
                      message: 'Saisissez une adresse email valide.',
                  });
        });
        disabled(schema.firstName, { when: () => this.isSubmitting() });
        disabled(schema.lastName, { when: () => this.isSubmitting() });
        disabled(schema.email, { when: () => this.isSubmitting() });
        disabled(schema.phone, { when: () => this.isSubmitting() });
        disabled(schema.profileId, { when: () => this.isSubmitting() });
    });

    protected readonly users = this.composition.usersList.items;
    protected readonly profiles = this.composition.profilesSelect.items;
    protected readonly page = this.composition.usersList.page;
    protected readonly usersState = this.composition.usersList.state;
    protected readonly profilesState = this.composition.profilesSelect.state;
    private readonly mobileGeneration = signal(0);
    private readonly mobileRequest = signal<MobilePageRequest | null>(null);
    private mobileSentinelGraceTimer: ReturnType<typeof setTimeout> | undefined;
    protected readonly mobileSentinelGrace = signal(false);
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
    protected readonly isReady = computed(() => this.users().length > 0);
    protected readonly isEmpty = computed(
        () => this.usersState() === 'empty' && this.users().length === 0
    );
    protected readonly canGoPrevious = computed(
        () => (this.page()?.currentPage ?? 1) > 1 && !this.isReloading()
    );
    protected readonly canGoNext = computed(() => {
        const page = this.page();
        return (
            !!page && page.currentPage < page.lastPage && !this.isReloading()
        );
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
        this.composition.profilesSelect.load();
        this.resetMobileProjection();
        this.destroyRef.onDestroy(() => {
            if (this.mobileSentinelGraceTimer) {
                clearTimeout(this.mobileSentinelGraceTimer);
            }
        });
        afterRenderEffect({
            read: (onCleanup) => {
                const sentinel = this.mobileLoadSentinel()?.nativeElement;
                if (
                    this.layout() !== 'compact' ||
                    !sentinel ||
                    !this.mobileHasNext() ||
                    this.mobileLoadingNext() ||
                    this.mobileFailedPage()
                ) {
                    return;
                }
                const root = this.workspace()?.nativeElement ?? null;
                const observer = new IntersectionObserver(
                    (entries) => {
                        if (entries.some((entry) => entry.isIntersecting)) {
                            this.loadNextMobilePage();
                        }
                    },
                    { root, rootMargin: '0px 0px 150% 0px', threshold: 0 }
                );
                observer.observe(sentinel);
                onCleanup(() => observer.disconnect());
            },
        });
    }

    protected applySearch(event: Event): void {
        event.preventDefault();
        this.resetMobileProjection();
    }

    protected openFilters(): void {
        if (this.areFiltersOpen()) return;
        if (!this.preserveFilterDraft()) {
            this.draftFilters.set({ ...this.appliedFilters() });
        }
        this.preserveFilterDraft.set(false);
        this.compactFilterDetail.set(null);
        this.areFiltersOpen.set(true);
        this.focusFilterPanel();
    }

    protected closeFilters(): void {
        if (this.layout() === 'expanded') {
            this.preserveFilterDraft.set(true);
        } else {
            this.draftFilters.set({ ...this.appliedFilters() });
            this.preserveFilterDraft.set(false);
        }
        this.compactFilterDetail.set(null);
        this.areFiltersOpen.set(false);
        this.restoreFilterTriggerFocus();
    }

    protected onFilterPanelKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || !this.isModalFilters()) return;
        event.preventDefault();
        this.closeFilters();
    }

    protected showCompactFilter(key: SecondaryFilterKey): void {
        this.compactFilterDetail.set(key);
        this.focusFilterPanelElement('[data-cmz-filter-detail-control]');
    }

    protected showCompactFilterSummary(): void {
        const detail = this.compactFilterDetail();
        this.compactFilterDetail.set(null);
        if (detail) {
            this.focusFilterPanelElement(
                `[data-cmz-filter-summary="${detail}"]`
            );
        }
    }

    protected setDraftStatus(status: string): void {
        this.draftFilters.update((filters) => ({ ...filters, status }));
    }

    protected resetDraftFilters(): void {
        this.draftFilters.set({ ...EMPTY_FILTERS });
    }

    protected applyFilters(event?: Event): void {
        event?.preventDefault();
        this.appliedFilters.set({ ...this.draftFilters() });
        this.preserveFilterDraft.set(false);
        this.compactFilterDetail.set(null);
        this.areFiltersOpen.set(false);
        this.resetMobileProjection();
        this.restoreFilterTriggerFocus();
    }

    protected removeAppliedFilter(key: SecondaryFilterKey): void {
        this.appliedFilters.update((filters) => ({
            ...filters,
            [key]: '',
        }));
        if (this.areFiltersOpen()) {
            this.draftFilters.set({ ...this.appliedFilters() });
        }
        this.resetMobileProjection();
    }

    protected draftFilterValue(key: SecondaryFilterKey): string {
        const value = this.draftFilters()[key];
        if (!value) return 'Tous';
        if (key === 'profile') {
            return (
                this.profiles().find((profile) => profile.value === value)
                    ?.label ?? value
            );
        }
        return key === 'role' ? this.roleLabel(value) : this.statusLabel(value);
    }

    protected goToPage(page: number): void {
        if (page < 1 || page > (this.page()?.lastPage ?? 1)) return;
        this.loadUsers(page);
    }

    protected openCreateForm(): void {
        if (!this.composition.createUser.authorized()) return;
        this.createForm().reset({ ...EMPTY_USER });
        this.failureNotice.set('');
        this.emailConflict.set(false);
        this.invalidCreateAttempt.set(false);
        this.isDiscardConfirmOpen.set(false);
        this.isCreateOpen.set(true);
        afterNextRender(
            { write: () => this.lastNameInput()?.nativeElement.focus() },
            { injector: this.injector }
        );
    }

    protected requestCloseCreateForm(): void {
        if (this.isSubmitting()) return;
        if (Object.values(this.createModel()).some((value) => value.trim())) {
            this.createReturnFocus =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : (this.lastNameInput()?.nativeElement ?? null);
            this.isDiscardConfirmOpen.set(true);
            return;
        }
        this.finishCloseCreateForm();
    }

    protected continueCreating(): void {
        this.isDiscardConfirmOpen.set(false);
        const target = this.createReturnFocus;
        this.focusAfterRender(
            () => target ?? this.lastNameInput()?.nativeElement
        );
    }

    protected abandonCreateForm(): void {
        this.isDiscardConfirmOpen.set(false);
        this.finishCloseCreateForm();
    }

    private finishCloseCreateForm(): void {
        this.isCreateOpen.set(false);
        this.failureNotice.set('');
        this.emailConflict.set(false);
        this.invalidCreateAttempt.set(false);
        this.createReturnFocus = null;
        this.restoreCreateButtonFocus();
    }

    protected onDialogKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || this.isDiscardConfirmOpen()) return;
        event.preventDefault();
        this.requestCloseCreateForm();
    }

    protected onDiscardKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        this.continueCreating();
    }

    protected async createUser(event: Event): Promise<void> {
        event.preventDefault();
        this.failureNotice.set('');
        this.emailConflict.set(false);
        const invalid = this.createForm().invalid();
        this.invalidCreateAttempt.set(invalid);

        await submit(this.createForm, async () => {
            const value = this.createModel();
            try {
                await firstValueFrom(
                    this.composition.createUser.submit({
                        firstName: value.firstName.trim(),
                        lastName: value.lastName.trim(),
                        email: value.email.trim(),
                        phone: value.phone.trim(),
                        profileId: value.profileId,
                    })
                );
                this.successNotice.set("L'utilisateur a été créé.");
                this.isCreateOpen.set(false);
                this.invalidCreateAttempt.set(false);
                this.createForm().reset({ ...EMPTY_USER });
                this.resetMobileProjection();
                this.restoreCreateButtonFocus();
                return undefined;
            } catch (error: unknown) {
                const detail = messageFrom(error);
                const isEmail = /e-?mail|adresse/i.test(detail);
                this.emailConflict.set(isEmail);
                this.failureNotice.set("L'utilisateur n'a pas été créé.");
                return [
                    {
                        kind: 'server',
                        message: isEmail
                            ? 'Cette adresse email existe déjà.'
                            : 'La création a échoué. Réessayez.',
                        fieldTree: isEmail
                            ? this.createForm.email
                            : this.createForm,
                    },
                ];
            }
        });
        if (invalid) {
            this.focusAfterRender(() => this.lastNameInput()?.nativeElement);
        } else if (this.emailConflict()) {
            this.focusAfterRender(() =>
                this.lastNameInput()?.nativeElement.form?.querySelector(
                    '[data-cmz-id="email"]'
                )
            );
        }
    }

    protected onEmailInput(): void {
        if (!this.emailConflict()) return;
        this.emailConflict.set(false);
        this.failureNotice.set('');
    }

    protected fieldError(
        field: () => {
            touched(): boolean;
            errors(): readonly { message?: string }[];
        }
    ): string {
        if (!field().touched()) return '';
        return field().errors()[0]?.message ?? '';
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

    protected retryMobilePage(): void {
        const request = this.mobileRequest();
        if (!request || this.mobileFailedPage() !== request.pageNumber) return;
        const retry = { ...request, attempt: request.attempt + 1 };
        this.keepMobileSentinelForImmediateFeedback();
        this.mobileRequest.set(retry);
        this.loadUsers(retry.pageNumber);
    }

    private loadNextMobilePage(): void {
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
        this.keepMobileSentinelForImmediateFeedback();
        this.mobileRequest.set(request);
        this.loadUsers(request.pageNumber);
    }

    private resetMobileProjection(): void {
        const generation = this.mobileGeneration() + 1;
        this.mobileGeneration.set(generation);
        this.mobileRequest.set({ attempt: 0, generation, pageNumber: 1 });
        this.loadUsers(1);
    }

    private keepMobileSentinelForImmediateFeedback(): void {
        if (this.mobileSentinelGraceTimer) {
            clearTimeout(this.mobileSentinelGraceTimer);
        }
        this.mobileSentinelGrace.set(true);
        this.mobileSentinelGraceTimer = setTimeout(
            () => this.mobileSentinelGrace.set(false),
            200
        );
    }

    private loadUsers(page: number): void {
        const filters = this.appliedFilters();
        const search = this.searchModel().search.trim();
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

    private focusFilterPanel(): void {
        this.focusAfterRender(() => this.filterPanel()?.nativeElement);
    }

    private focusFilterPanelElement(selector: string): void {
        this.focusAfterRender(() =>
            this.filterPanel()?.nativeElement.querySelector<HTMLElement>(
                selector
            )
        );
    }

    private restoreFilterTriggerFocus(): void {
        this.focusAfterRender(() => this.filterTrigger()?.nativeElement);
    }
}
