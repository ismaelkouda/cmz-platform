import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { createBrowserAccessDecision } from '../../access-policy';
import { CreateUserDialog, type CreateUserValues } from './page-create-form';
import {
    EMPTY_USERS_FILTERS,
    FilterIcon,
    type UsersFilterForm,
    UsersFilterPanel,
} from './page-filters';
import { createBrowserUsersManagementPageRuntime } from './page-host';
import styles from './page.module.scss';

function roleLabel(role: string | null): string {
    if (role === 'supervisor') return 'Superviseur';
    if (role === 'team-leader') return "Chef d'équipe";
    if (role === 'agent') return 'Agent';
    return '—';
}

function statusLabel(status: string): string {
    if (status === 'active') return 'Actif';
    if (status === 'inactive') return 'Inactif';
    if (status === 'blocked') return 'Bloqué';
    if (status === 'pending') return 'En attente';
    return status;
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return value;
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

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
    const loadInitialUsers = composition.usersList.load;
    const loadProfiles = composition.profilesSelect.load;

    useEffect(() => {
        void Promise.all([loadInitialUsers({ page: 1 }), loadProfiles()]).catch(
            () => undefined
        );
    }, [loadInitialUsers, loadProfiles]);

    const totalUsers = composition.usersList.page?.totalItems ?? 0;
    const activeFilterCount =
        Object.values(appliedFilters).filter(Boolean).length;
    const loading = composition.usersList.state === 'loading';
    const queryFailed = composition.usersList.state === 'error';
    const empty = composition.usersList.state === 'empty';
    const reloading = composition.usersList.state === 'reloading';
    const submitting = composition.createUser.state === 'submitting';

    async function loadUsers(
        page: number,
        nextSearch = search,
        filters = appliedFilters
    ) {
        const input = {
            page,
            ...(nextSearch.trim() ? { search: nextSearch.trim() } : {}),
            ...(filters.profile ? { profile: filters.profile } : {}),
            ...(filters.role ? { role: filters.role } : {}),
            ...(filters.status
                ? { isActive: filters.status === 'active' }
                : {}),
        };
        setCurrentPage(page);
        await composition.usersList.load(input).catch(() => undefined);
    }

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
        return result.message || 'Utilisateur créé.';
    }

    function applySearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void loadUsers(1);
    }

    function applyFilters() {
        setAppliedFilters(draftFilters);
        setFiltersOpen(false);
        void loadUsers(1, search, draftFilters);
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
                                <span className={styles.actionLabel}>
                                    Créer
                                </span>
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryAction}
                                aria-label="Rafraîchir la liste des utilisateurs"
                                disabled={loading || reloading}
                                onClick={() =>
                                    void composition.usersList
                                        .reload()
                                        .catch(() => undefined)
                                }
                            >
                                <RefreshIcon />
                                <span className={styles.actionLabel}>
                                    Rafraîchir
                                </span>
                            </button>
                            <button
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
                                    setDraftFilters(appliedFilters);
                                    setFiltersOpen((open) => !open);
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
                                onClick={() => void loadUsers(currentPage)}
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
                                            <th scope="col">Nom et prénom</th>
                                            <th scope="col">Adresse e-mail</th>
                                            <th scope="col">Profil</th>
                                            <th scope="col">Rôle</th>
                                            <th scope="col">Statut</th>
                                            <th scope="col">Mise à jour</th>
                                        </tr>
                                    </thead>
                                    <tbody data-cmz-id="users">
                                        {composition.usersList.items.map(
                                            (user, index) => (
                                                <tr key={user.uniqId}>
                                                    <td>
                                                        {(currentPage - 1) *
                                                            (composition
                                                                .usersList.page
                                                                ?.pageSize ??
                                                                0) +
                                                            index +
                                                            1}
                                                    </td>
                                                    <td>
                                                        <strong>
                                                            {user.lastName}{' '}
                                                            {user.firstName}
                                                        </strong>
                                                        <span
                                                            className={
                                                                styles.mobileDetail
                                                            }
                                                        >
                                                            {user.email}
                                                        </span>
                                                    </td>
                                                    <td>{user.email}</td>
                                                    <td>{user.profile}</td>
                                                    <td>
                                                        {roleLabel(user.role)}
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

                            {(composition.usersList.page?.lastPage ?? 1) >
                                1 && (
                                <nav
                                    className={styles.pagination}
                                    aria-label="Pagination des utilisateurs"
                                >
                                    <button
                                        type="button"
                                        disabled={currentPage <= 1 || reloading}
                                        onClick={() =>
                                            void loadUsers(currentPage - 1)
                                        }
                                    >
                                        Précédent
                                    </button>
                                    <span aria-live="polite">
                                        Page {currentPage} sur{' '}
                                        {composition.usersList.page?.lastPage}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={
                                            currentPage >=
                                                (composition.usersList.page
                                                    ?.lastPage ?? 1) ||
                                            reloading
                                        }
                                        onClick={() =>
                                            void loadUsers(currentPage + 1)
                                        }
                                    >
                                        Suivant
                                    </button>
                                </nav>
                            )}
                        </div>

                        {filtersOpen && (
                            <UsersFilterPanel
                                filters={draftFilters}
                                profiles={composition.profilesSelect.items}
                                onChange={setDraftFilters}
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
