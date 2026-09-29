import { CdkTrapFocus } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
    Component,
    ElementRef,
    Injector,
    afterNextRender,
    computed,
    inject,
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
import { APP_ACCESS_DECISION } from '../../access.guard';

interface SearchModel {
    search: string;
}

interface SecondaryFiltersModel {
    profile: string;
    role: string;
    status: string;
}

type SecondaryFilterKey = keyof SecondaryFiltersModel;

interface AppliedFilterItem {
    key: SecondaryFilterKey;
    label: string;
    value: string;
}

interface CreateUserModel {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileId: string;
}

const EMPTY_SEARCH: SearchModel = {
    search: '',
};

const EMPTY_FILTERS: SecondaryFiltersModel = {
    profile: '',
    role: '',
    status: '',
};

const EMPTY_USER: CreateUserModel = {
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
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message;
    }
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
    private readonly injector = inject(Injector);
    private readonly createButton =
        viewChild<ElementRef<HTMLButtonElement>>('createButton');
    private readonly firstNameInput =
        viewChild<ElementRef<HTMLInputElement>>('firstNameInput');
    private readonly filterTrigger =
        viewChild<ElementRef<HTMLButtonElement>>('filterTrigger');
    private readonly filterPanel =
        viewChild<ElementRef<HTMLElement>>('filterPanel');

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

    protected readonly searchModel = signal<SearchModel>({ ...EMPTY_SEARCH });
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
    protected readonly createModel = signal<CreateUserModel>({ ...EMPTY_USER });
    protected readonly isCreateOpen = signal(false);
    protected readonly isModalCreate = computed(
        () => this.isCreateOpen() && this.layout() !== 'expanded'
    );
    protected readonly successNotice = signal('');
    protected readonly failureNotice = signal('');
    protected readonly emailConflict = signal(false);

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
    protected readonly isInitialLoading = computed(
        () =>
            this.users().length === 0 &&
            (this.usersState() === 'idle' || this.usersState() === 'loading')
    );
    protected readonly isReloading = computed(
        () => this.usersState() === 'reloading'
    );
    protected readonly hasQueryError = computed(
        () => this.usersState() === 'error' || this.profilesState() === 'error'
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
        this.loadUsers(1);
    }

    protected applySearch(event: Event): void {
        event.preventDefault();
        this.loadUsers(1);
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
    }

    protected showCompactFilterSummary(): void {
        this.compactFilterDetail.set(null);
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
        this.loadUsers(1);
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
        this.loadUsers(1);
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
        this.isCreateOpen.set(true);
        afterNextRender(
            { write: () => this.firstNameInput()?.nativeElement.focus() },
            { injector: this.injector }
        );
    }

    protected closeCreateForm(): void {
        if (this.isSubmitting()) return;
        this.isCreateOpen.set(false);
        this.failureNotice.set('');
        this.emailConflict.set(false);
        this.restoreCreateButtonFocus();
    }

    protected onDialogKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || !this.isModalCreate()) return;
        event.preventDefault();
        this.closeCreateForm();
    }

    protected async createUser(event: Event): Promise<void> {
        event.preventDefault();
        this.failureNotice.set('');
        this.emailConflict.set(false);

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
                this.createForm().reset({ ...EMPTY_USER });
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

    private restoreCreateButtonFocus(): void {
        afterNextRender(
            { write: () => this.createButton()?.nativeElement.focus() },
            { injector: this.injector }
        );
    }

    private focusFilterPanel(): void {
        afterNextRender(
            { write: () => this.filterPanel()?.nativeElement.focus() },
            { injector: this.injector }
        );
    }

    private restoreFilterTriggerFocus(): void {
        afterNextRender(
            { write: () => this.filterTrigger()?.nativeElement.focus() },
            { injector: this.injector }
        );
    }
}
