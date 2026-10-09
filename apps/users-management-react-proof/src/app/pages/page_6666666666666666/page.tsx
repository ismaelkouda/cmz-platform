import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { createBrowserAccessDecision } from '../../access-policy';
import {
    compactRequestKey,
    CompactUsersResults,
    emptyCompactProjection,
    flattenCompactPages,
    formatDate,
    reduceCompactProjection,
    roleLabel,
    statusLabel,
    type CompactPageRequest,
    type CompactProjection,
    useCompactLayout,
} from './page-compact-users';
import { CreateUserDialog, type CreateUserValues } from './page-create-form';
import {
    EMPTY_USERS_FILTERS,
    FilterIcon,
    type UsersFilterForm,
    UsersFilterPanel,
} from './page-filters';
import { createBrowserUsersManagementPageRuntime } from './page-host';
import styles from './page.module.scss';

function SearchIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M9.5 3a6.5 6.5 0 1 0 4.08 11.56L18 19l1.5-1.5-4.44-4.42A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 16.2 7.8L13 11h7V4l-2.35 2.35Z" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
        </svg>
    );
}

export function Pagepage6666666666666666() {
    const runtime = useMemo(
        () => createBrowserUsersManagementPageRuntime(),
        []
    );
    const canCreate = createBrowserAccessDecision(
        window.__cmzAppAccessContext
    ).hasPermission('users.create');
    const permissions = useMemo(
        () => new Set(canCreate ? ['users.create'] : []),
        [canCreate]
    );
    const composition = runtime.usePageComposition(permissions);
    const isCompact = useCompactLayout();
    type UserItem = (typeof composition.usersList.items)[number];
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState('');
    const [appliedFilters, setAppliedFilters] =
        useState<UsersFilterForm>(EMPTY_USERS_FILTERS);
    const [draftFilters, setDraftFilters] =
        useState<UsersFilterForm>(EMPTY_USERS_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [successNotice, setSuccessNotice] = useState('');
    const createTriggerRef = useRef<HTMLButtonElement>(null);
    const filterTriggerRef = useRef<HTMLButtonElement>(null);
    const compactSentinelRef = useRef<HTMLSpanElement>(null);
    const compactGenerationRef = useRef(1);
    const compactInFlightRef = useRef<string | null>(null);
    const previousCompactRef = useRef(isCompact);
    const [compactAutoLoadArmed, setCompactAutoLoadArmed] = useState(isCompact);
    const [compactRequest, setCompactRequest] = useState<CompactPageRequest>({
        attempt: 0,
        generation: 1,
        pageNumber: 1,
    });
    const [compactProjection, setCompactProjection] = useState<
        CompactProjection<UserItem>
    >(() => emptyCompactProjection(1));
    const loadInitialUsers = composition.usersList.load;
    const loadProfiles = composition.profilesSelect.load;

    useEffect(() => {
        const scheduledLoad = window.setTimeout(() => {
            void Promise.all([
                loadInitialUsers({ page: 1 }),
                loadProfiles(),
            ]).catch(() => undefined);
        }, 0);
        return () => window.clearTimeout(scheduledLoad);
    }, [loadInitialUsers, loadProfiles]);

    const projectionPage = composition.usersList.page;
    const projectionState = composition.usersList.state;
    const [previousProjectionSource, setPreviousProjectionSource] = useState(
        () => ({
            page: projectionPage,
            request: compactRequest,
            state: projectionState,
        })
    );
    if (
        previousProjectionSource.page !== projectionPage ||
        previousProjectionSource.request !== compactRequest ||
        previousProjectionSource.state !== projectionState
    ) {
        setPreviousProjectionSource({
            page: projectionPage,
            request: compactRequest,
            state: projectionState,
        });
        setCompactProjection((previous) =>
            reduceCompactProjection(
                previous,
                compactRequest,
                projectionState,
                projectionPage
            )
        );
    }

    useEffect(() => {
        const key = compactRequestKey(compactRequest);
        if (
            compactProjection.settledRequestKey === key ||
            compactProjection.failedRequestKey === key
        ) {
            compactInFlightRef.current = null;
        }
    }, [compactProjection, compactRequest]);

    useEffect(() => {
        if (previousCompactRef.current !== isCompact) {
            previousCompactRef.current = isCompact;
            setCompactAutoLoadArmed(false);
        }
    }, [isCompact]);

    useEffect(() => {
        if (!isCompact || compactAutoLoadArmed) return;
        const arm = () => setCompactAutoLoadArmed(true);
        window.addEventListener('scroll', arm, { passive: true, once: true });
        window.addEventListener('wheel', arm, { passive: true, once: true });
        window.addEventListener('touchmove', arm, {
            passive: true,
            once: true,
        });
        return () => {
            window.removeEventListener('scroll', arm);
            window.removeEventListener('wheel', arm);
            window.removeEventListener('touchmove', arm);
        };
    }, [compactAutoLoadArmed, isCompact]);

    const compactUsers = useMemo(
        () => flattenCompactPages(compactProjection.pages),
        [compactProjection.pages]
    );
    const compactLastLoadedPage = useMemo(() => {
        let pageNumber = 0;
        while (compactProjection.pages.has(pageNumber + 1)) pageNumber += 1;
        return pageNumber;
    }, [compactProjection.pages]);
    const compactHasNext =
        compactLastLoadedPage > 0 &&
        compactLastLoadedPage < compactProjection.lastPage;
    const compactRequestKeyValue = compactRequestKey(compactRequest);
    const compactLoadingNext =
        compactRequest.pageNumber > 1 &&
        compactProjection.settledRequestKey !== compactRequestKeyValue &&
        compactProjection.failedRequestKey !== compactRequestKeyValue;
    const compactFailedPage =
        compactRequest.pageNumber > 1 &&
        compactProjection.failedRequestKey === compactRequestKeyValue
            ? compactRequest.pageNumber
            : null;
    const totalUsers = isCompact
        ? compactProjection.totalItems
        : (composition.usersList.page?.totalItems ?? 0);
    const activeFilterCount =
        Object.values(appliedFilters).filter(Boolean).length;
    const loading =
        composition.usersList.state === 'loading' &&
        (!isCompact ||
            compactUsers.length === 0 ||
            compactRequest.pageNumber === 1);
    const queryFailed =
        composition.usersList.state === 'error' &&
        (!isCompact || compactFailedPage === null);
    const empty =
        composition.usersList.state === 'empty' &&
        (!isCompact || compactUsers.length === 0);
    const reloading = composition.usersList.state === 'reloading';
    const submitting = composition.createUser.state === 'submitting';

    const requestUsers = useCallback(
        (
            page: number,
            options: {
                readonly attempt?: number;
                readonly filters?: UsersFilterForm;
                readonly reset?: boolean;
                readonly search?: string;
            } = {}
        ) => {
            const nextSearch = options.search ?? search;
            const filters = options.filters ?? appliedFilters;
            const generation = options.reset
                ? compactGenerationRef.current + 1
                : compactGenerationRef.current;
            if (options.reset) {
                compactGenerationRef.current = generation;
                compactInFlightRef.current = null;
                setCompactProjection(emptyCompactProjection(generation));
            }
            const request = {
                attempt: options.attempt ?? 0,
                generation,
                pageNumber: page,
            };
            setCompactRequest(request);
            setCurrentPage(page);
            return loadInitialUsers({
                page,
                ...(nextSearch.trim() ? { search: nextSearch.trim() } : {}),
                ...(filters.profile ? { profile: filters.profile } : {}),
                ...(filters.role ? { role: filters.role } : {}),
                ...(filters.status
                    ? { isActive: filters.status === 'active' }
                    : {}),
            }).catch(() => undefined);
        },
        [appliedFilters, loadInitialUsers, search]
    );

    const loadNextCompactPage = useCallback(() => {
        if (
            !isCompact ||
            !compactAutoLoadArmed ||
            !compactHasNext ||
            compactLoadingNext ||
            compactFailedPage !== null ||
            compactInFlightRef.current
        ) {
            return;
        }
        const page = compactLastLoadedPage + 1;
        const request = {
            attempt: 0,
            generation: compactGenerationRef.current,
            pageNumber: page,
        };
        compactInFlightRef.current = compactRequestKey(request);
        void requestUsers(page);
    }, [
        compactAutoLoadArmed,
        compactFailedPage,
        compactHasNext,
        compactLastLoadedPage,
        compactLoadingNext,
        isCompact,
        requestUsers,
    ]);

    useEffect(() => {
        const sentinel = compactSentinelRef.current;
        if (
            !isCompact ||
            !compactAutoLoadArmed ||
            !sentinel ||
            !compactHasNext ||
            compactLoadingNext ||
            compactFailedPage !== null
        ) {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadNextCompactPage();
                }
            },
            { rootMargin: '0px 0px 150% 0px', threshold: 0 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [
        compactAutoLoadArmed,
        compactFailedPage,
        compactHasNext,
        compactLoadingNext,
        isCompact,
        loadNextCompactPage,
    ]);

    function openCreate() {
        setSuccessNotice('');
        setCreateOpen(true);
    }

    function closeCreate() {
        if (submitting) return;
        setCreateOpen(false);
    }

    async function submitCreate(values: CreateUserValues) {
        setSuccessNotice('');
        const result = await composition.createUser.submit(values);
        if (isCompact) void requestUsers(1, { reset: true });
        return result.message || 'Utilisateur créé.';
    }

    function applySearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void requestUsers(1, { reset: true });
    }

    function applyFilters() {
        setAppliedFilters(draftFilters);
        setFiltersOpen(false);
        window.setTimeout(() => filterTriggerRef.current?.focus(), 0);
        void requestUsers(1, {
            filters: draftFilters,
            reset: true,
            search,
        });
    }

    function closeFilters() {
        setDraftFilters(appliedFilters);
        setFiltersOpen(false);
        window.setTimeout(() => filterTriggerRef.current?.focus(), 0);
    }

    function retryCompactPage() {
        if (compactFailedPage === null || compactInFlightRef.current) return;
        const attempt = compactRequest.attempt + 1;
        const request = {
            attempt,
            generation: compactRequest.generation,
            pageNumber: compactFailedPage,
        };
        compactInFlightRef.current = compactRequestKey(request);
        void requestUsers(compactFailedPage, { attempt });
    }

    return (
        <main
            data-cmz-id="main"
            className={`${styles.page} min-h-screen bg-slate-50 text-slate-950`}
            tabIndex={-1}
        >
            <header className={styles.appBar}>
                <span className={styles.brandMark} aria-hidden="true" />
                <strong>CMZ Platform</strong>
                <span className={styles.operator}>Opérateur connecté</span>
            </header>

            <section className={styles.content}>
                <h1
                    data-cmz-id="page-heading"
                    className="text-2xl font-semibold"
                >
                    Gestion des utilisateurs
                </h1>

                <section
                    data-cmz-id="users-table"
                    className={styles.dataView}
                    aria-labelledby="users-title"
                >
                    <div className={styles.toolbar}>
                        <h2 id="users-title" className={styles.tableTitle}>
                            Utilisateurs
                            <span
                                className={styles.totalBadge}
                                aria-label={`${totalUsers} utilisateur${totalUsers > 1 ? 's' : ''} au total`}
                            >
                                {totalUsers}
                            </span>
                        </h2>

                        <form
                            className={styles.search}
                            role="search"
                            aria-label="Recherche dans les utilisateurs"
                            onSubmit={applySearch}
                        >
                            <label htmlFor="users-search" className="sr-only">
                                Rechercher un utilisateur
                            </label>
                            <SearchIcon />
                            <input
                                id="users-search"
                                type="search"
                                value={search}
                                placeholder="Nom, prénom ou adresse e-mail"
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </form>

                        <div
                            className={styles.actions}
                            role="group"
                            aria-label="Actions de la liste des utilisateurs"
                        >
                            <button
                                ref={createTriggerRef}
                                data-cmz-id="create-user"
                                type="button"
                                className={styles.primaryAction}
                                aria-label="Créer un utilisateur"
                                title="Créer un utilisateur"
                                disabled={
                                    !composition.createUser.authorized ||
                                    createOpen
                                }
                                aria-describedby={
                                    composition.createUser.authorized
                                        ? undefined
                                        : 'create-denied'
                                }
                                onClick={openCreate}
                            >
                                <PlusIcon />
                                {!isCompact && (
                                    <span className={styles.actionLabel}>
                                        Créer
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryAction}
                                aria-label="Rafraîchir la liste des utilisateurs"
                                disabled={loading || reloading}
                                onClick={() => {
                                    if (isCompact) {
                                        void requestUsers(1, { reset: true });
                                        return;
                                    }
                                    void composition.usersList
                                        .reload()
                                        .catch(() => undefined);
                                }}
                            >
                                <RefreshIcon />
                                <span className={styles.actionLabel}>
                                    Rafraîchir
                                </span>
                            </button>
                            <button
                                ref={filterTriggerRef}
                                type="button"
                                className={`${styles.secondaryAction} ${
                                    filtersOpen ? styles.toggleActive : ''
                                }`}
                                aria-label={
                                    activeFilterCount
                                        ? `Filtres, ${activeFilterCount} actif${activeFilterCount > 1 ? 's' : ''}`
                                        : 'Filtres'
                                }
                                aria-expanded={filtersOpen}
                                aria-controls="users-filter-panel"
                                onClick={() => {
                                    if (filtersOpen) {
                                        closeFilters();
                                        return;
                                    }
                                    setDraftFilters(appliedFilters);
                                    setFiltersOpen(true);
                                }}
                            >
                                <FilterIcon />
                                <span className={styles.actionLabel}>
                                    Filtres
                                </span>
                                {activeFilterCount > 0 && (
                                    <span
                                        className={styles.filterCount}
                                        aria-hidden="true"
                                    >
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <p id="create-denied" className="sr-only">
                        La permission users.create est requise pour créer un
                        utilisateur.
                    </p>

                    {activeFilterCount > 0 && (
                        <div
                            className={styles.activeFilters}
                            aria-label="Filtres appliqués"
                        >
                            {appliedFilters.profile && (
                                <span>
                                    Profil :{' '}
                                    {composition.profilesSelect.items.find(
                                        (profile) =>
                                            profile.value ===
                                            appliedFilters.profile
                                    )?.label ?? appliedFilters.profile}
                                </span>
                            )}
                            {appliedFilters.role && (
                                <span>
                                    Rôle : {roleLabel(appliedFilters.role)}
                                </span>
                            )}
                            {appliedFilters.status && (
                                <span>
                                    Statut :{' '}
                                    {appliedFilters.status === 'active'
                                        ? 'Actif'
                                        : 'Inactif'}
                                </span>
                            )}
                        </div>
                    )}

                    <div className={styles.dataRegion}>
                        <div
                            data-cmz-id="loading"
                            className={styles.statePanel}
                            hidden={!loading}
                            aria-live="polite"
                        >
                            Chargement des utilisateurs…
                        </div>
                        <div
                            data-cmz-id="query-failed"
                            className={styles.statePanel}
                            hidden={!queryFailed}
                            role="alert"
                        >
                            <p>Les utilisateurs n’ont pas pu être chargés.</p>
                            <button
                                type="button"
                                className={styles.secondaryAction}
                                onClick={() => void requestUsers(currentPage)}
                            >
                                Réessayer
                            </button>
                        </div>
                        <div
                            data-cmz-id="empty"
                            className={styles.statePanel}
                            hidden={!empty}
                        >
                            Aucun utilisateur ne correspond à cette recherche.
                        </div>

                        <div
                            data-cmz-id="ready"
                            hidden={loading || queryFailed || empty}
                        >
                            {isCompact ? (
                                <CompactUsersResults
                                    announcement={
                                        compactProjection.announcement
                                    }
                                    failedPage={compactFailedPage}
                                    hasNext={compactHasNext}
                                    loadingNext={compactLoadingNext}
                                    onRetry={retryCompactPage}
                                    sentinelRef={compactSentinelRef}
                                    totalItems={compactProjection.totalItems}
                                    users={compactUsers}
                                />
                            ) : (
                                <>
                                    <div
                                        className={styles.tableScroller}
                                        role="region"
                                        aria-labelledby="users-title"
                                        tabIndex={0}
                                    >
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th scope="col">#</th>
                                                    <th scope="col">
                                                        Nom et prénom
                                                    </th>
                                                    <th scope="col">
                                                        Adresse e-mail
                                                    </th>
                                                    <th scope="col">Profil</th>
                                                    <th scope="col">Rôle</th>
                                                    <th scope="col">Statut</th>
                                                    <th scope="col">
                                                        Mise à jour
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody data-cmz-id="users">
                                                {composition.usersList.items.map(
                                                    (user, index) => (
                                                        <tr
                                                            key={user.uniqId}
                                                            data-cmz-user-id={
                                                                user.uniqId
                                                            }
                                                        >
                                                            <td>
                                                                {(currentPage -
                                                                    1) *
                                                                    (composition
                                                                        .usersList
                                                                        .page
                                                                        ?.pageSize ??
                                                                        0) +
                                                                    index +
                                                                    1}
                                                            </td>
                                                            <td>
                                                                <strong>
                                                                    {
                                                                        user.lastName
                                                                    }{' '}
                                                                    {
                                                                        user.firstName
                                                                    }
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                {user.email}
                                                            </td>
                                                            <td>
                                                                {user.profile}
                                                            </td>
                                                            <td>
                                                                {roleLabel(
                                                                    user.role
                                                                )}
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className={`${styles.status} ${styles[`status-${user.status}`] ?? ''}`}
                                                                >
                                                                    {statusLabel(
                                                                        user.status
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {formatDate(
                                                                    user.updatedAt
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {(composition.usersList.page?.lastPage ??
                                        1) > 1 && (
                                        <nav
                                            className={styles.pagination}
                                            aria-label="Pagination des utilisateurs"
                                        >
                                            <button
                                                type="button"
                                                disabled={
                                                    currentPage <= 1 ||
                                                    reloading
                                                }
                                                onClick={() =>
                                                    void requestUsers(
                                                        currentPage - 1
                                                    )
                                                }
                                            >
                                                Précédent
                                            </button>
                                            <span aria-live="polite">
                                                Page {currentPage} sur{' '}
                                                {
                                                    composition.usersList.page
                                                        ?.lastPage
                                                }
                                            </span>
                                            <button
                                                type="button"
                                                disabled={
                                                    currentPage >=
                                                        (composition.usersList
                                                            .page?.lastPage ??
                                                            1) || reloading
                                                }
                                                onClick={() =>
                                                    void requestUsers(
                                                        currentPage + 1
                                                    )
                                                }
                                            >
                                                Suivant
                                            </button>
                                        </nav>
                                    )}
                                </>
                            )}
                        </div>

                        {filtersOpen && (
                            <UsersFilterPanel
                                compact={isCompact}
                                filters={draftFilters}
                                profiles={composition.profilesSelect.items}
                                returnFocusRef={filterTriggerRef}
                                onChange={setDraftFilters}
                                onClose={closeFilters}
                                onReset={() =>
                                    setDraftFilters(EMPTY_USERS_FILTERS)
                                }
                                onApply={applyFilters}
                            />
                        )}
                    </div>
                </section>
            </section>

            <div className="sr-only" data-cmz-id="profiles">
                {composition.profilesSelect.items.length} profils disponibles
            </div>
            <div
                data-cmz-id="created"
                className={styles.toast}
                hidden={!successNotice}
                role="status"
            >
                {successNotice}
            </div>
            <CreateUserDialog
                open={createOpen}
                submitting={submitting}
                profilesLoading={composition.profilesSelect.state === 'loading'}
                profiles={composition.profilesSelect.items}
                returnFocusRef={createTriggerRef}
                onClose={closeCreate}
                onSubmit={submitCreate}
                onCreated={setSuccessNotice}
            />
        </main>
    );
}
