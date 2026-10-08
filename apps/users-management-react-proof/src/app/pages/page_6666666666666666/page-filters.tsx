import {
    type FormEvent,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';

import filterStyles from './page-filters.module.scss';
import styles from './page.module.scss';

export interface UsersFilterForm {
    readonly profile: string;
    readonly role: string;
    readonly status: '' | 'active' | 'inactive';
}

export interface ProfileOption {
    readonly label: string;
    readonly value: string;
}

export const EMPTY_USERS_FILTERS: UsersFilterForm = Object.freeze({
    profile: '',
    role: '',
    status: '',
});

type FilterKey = keyof UsersFilterForm;

const FILTER_LABELS: Readonly<Record<FilterKey, string>> = {
    profile: 'Profil',
    role: 'Rôle',
    status: 'Statut',
};

const FILTER_KEYS: readonly FilterKey[] = ['profile', 'role', 'status'];

interface UsersFilterPanelProps {
    readonly compact: boolean;
    readonly filters: UsersFilterForm;
    readonly profiles: readonly ProfileOption[];
    readonly returnFocusRef: RefObject<HTMLButtonElement | null>;
    readonly onChange: (filters: UsersFilterForm) => void;
    readonly onClose: () => void;
    readonly onReset: () => void;
    readonly onApply: () => void;
}

export function FilterIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 5h16v2H4V5Zm3 6h10v2H7v-2Zm3 6h4v2h-4v-2Z" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m9 18 6-6-6-6 1.4-1.4 7.4 7.4-7.4 7.4L9 18Z" />
        </svg>
    );
}

function filterValue(
    key: FilterKey,
    filters: UsersFilterForm,
    profiles: readonly ProfileOption[]
): string {
    if (key === 'profile') {
        return (
            profiles.find(({ value }) => value === filters.profile)?.label ??
            'Tous les profils'
        );
    }
    if (key === 'role') {
        if (filters.role === 'supervisor') return 'Superviseur';
        if (filters.role === 'team-leader') return 'Chef d’équipe';
        if (filters.role === 'agent') return 'Agent';
        return 'Tous les rôles';
    }
    if (filters.status === 'active') return 'Actifs';
    if (filters.status === 'inactive') return 'Inactifs';
    return 'Tous';
}

interface FilterControlProps {
    readonly filterKey: FilterKey;
    readonly filters: UsersFilterForm;
    readonly profiles: readonly ProfileOption[];
    readonly controlRef?: (
        element: HTMLInputElement | HTMLSelectElement | null
    ) => void;
    readonly onChange: (filters: UsersFilterForm) => void;
}

function FilterControl({
    filterKey,
    filters,
    profiles,
    controlRef,
    onChange,
}: FilterControlProps) {
    if (filterKey === 'profile') {
        return (
            <label>
                Profil
                <select
                    ref={controlRef}
                    value={filters.profile}
                    onChange={(event) =>
                        onChange({ ...filters, profile: event.target.value })
                    }
                >
                    <option value="">Tous les profils</option>
                    {profiles.map((profile) => (
                        <option key={profile.value} value={profile.value}>
                            {profile.label}
                        </option>
                    ))}
                </select>
            </label>
        );
    }

    if (filterKey === 'role') {
        return (
            <label>
                Rôle
                <select
                    ref={controlRef}
                    value={filters.role}
                    onChange={(event) =>
                        onChange({ ...filters, role: event.target.value })
                    }
                >
                    <option value="">Tous les rôles</option>
                    <option value="supervisor">Superviseur</option>
                    <option value="team-leader">Chef d’équipe</option>
                    <option value="agent">Agent</option>
                </select>
            </label>
        );
    }

    return (
        <fieldset>
            <legend>Statut</legend>
            <label>
                <input
                    ref={controlRef}
                    type="radio"
                    name="status"
                    value=""
                    checked={!filters.status}
                    onChange={() => onChange({ ...filters, status: '' })}
                />{' '}
                Tous
            </label>
            <label>
                <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={filters.status === 'active'}
                    onChange={() => onChange({ ...filters, status: 'active' })}
                />{' '}
                Actifs
            </label>
            <label>
                <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={filters.status === 'inactive'}
                    onChange={() =>
                        onChange({ ...filters, status: 'inactive' })
                    }
                />{' '}
                Inactifs
            </label>
        </fieldset>
    );
}

function DesktopFilterPanel({
    filters,
    profiles,
    onChange,
    onReset,
    onApply,
}: Pick<
    UsersFilterPanelProps,
    'filters' | 'profiles' | 'onChange' | 'onReset' | 'onApply'
>) {
    return (
        <aside
            id="users-filter-panel"
            className={styles.filterPanel}
            aria-label="Filtres des utilisateurs"
        >
            <div className={styles.filterFields}>
                {FILTER_KEYS.map((filterKey) => (
                    <FilterControl
                        key={filterKey}
                        filterKey={filterKey}
                        filters={filters}
                        profiles={profiles}
                        onChange={onChange}
                    />
                ))}
            </div>
            <div className={styles.filterActions}>
                <button type="button" onClick={onReset}>
                    Réinitialiser
                </button>
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={onApply}
                >
                    Appliquer
                </button>
            </div>
        </aside>
    );
}

export function UsersFilterPanel(props: UsersFilterPanelProps) {
    const {
        compact,
        filters,
        profiles,
        returnFocusRef,
        onChange,
        onClose,
        onReset,
        onApply,
    } = props;
    const [detail, setDetail] = useState<FilterKey | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const summaryRefs = useRef<Partial<Record<FilterKey, HTMLButtonElement>>>(
        {}
    );
    const detailControlRef = useRef<
        HTMLInputElement | HTMLSelectElement | null
    >(null);
    const returnToSummaryRef = useRef<FilterKey | null>(null);

    useEffect(() => {
        if (!compact) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        const returnFocusElement = returnFocusRef.current;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.open = true;
        summaryRefs.current.profile?.focus();
        return () => {
            if (dialog.open && typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.open = false;
            }
            window.requestAnimationFrame(() => returnFocusElement?.focus());
        };
    }, [compact, returnFocusRef]);

    useEffect(() => {
        if (!compact) return;
        if (detail) {
            detailControlRef.current?.focus();
            return;
        }
        const returnTarget = returnToSummaryRef.current;
        if (!returnTarget) return;
        summaryRefs.current[returnTarget]?.focus();
        returnToSummaryRef.current = null;
    }, [compact, detail]);

    if (!compact) return <DesktopFilterPanel {...props} />;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onApply();
    }

    function showDetail(filterKey: FilterKey) {
        setDetail(filterKey);
    }

    function showSummary() {
        if (!detail) return;
        returnToSummaryRef.current = detail;
        setDetail(null);
    }

    const title = detail ? FILTER_LABELS[detail] : 'Filtres';

    return (
        <dialog
            ref={dialogRef}
            id="users-filter-panel"
            className={filterStyles.filterDialog}
            aria-modal="true"
            aria-labelledby="users-filter-title"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
        >
            <form className={filterStyles.compactFilterForm} onSubmit={submit}>
                <header className={filterStyles.compactFilterHeader}>
                    {detail ? (
                        <button
                            type="button"
                            className={filterStyles.filterBack}
                            onClick={showSummary}
                        >
                            <span aria-hidden="true">‹</span>
                            <span className={filterStyles.filterBackLabel}>
                                Retour
                            </span>
                        </button>
                    ) : (
                        <span aria-hidden="true" />
                    )}
                    <h2 id="users-filter-title">{title}</h2>
                    <button
                        type="button"
                        className={filterStyles.filterClose}
                        aria-label="Fermer les filtres"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className={filterStyles.compactFilterBody}>
                    {detail ? (
                        <div className={styles.filterFields}>
                            <FilterControl
                                filterKey={detail}
                                filters={filters}
                                profiles={profiles}
                                controlRef={(element) => {
                                    detailControlRef.current = element;
                                }}
                                onChange={onChange}
                            />
                        </div>
                    ) : (
                        <div className={filterStyles.filterSummary}>
                            {FILTER_KEYS.map((filterKey) => {
                                const value = filterValue(
                                    filterKey,
                                    filters,
                                    profiles
                                );
                                return (
                                    <button
                                        key={filterKey}
                                        ref={(element) => {
                                            summaryRefs.current[filterKey] =
                                                element ?? undefined;
                                        }}
                                        type="button"
                                        aria-label={`${FILTER_LABELS[filterKey]}, ${value}`}
                                        onClick={() => showDetail(filterKey)}
                                    >
                                        <span>
                                            <strong>
                                                {FILTER_LABELS[filterKey]}
                                            </strong>
                                            <small>{value}</small>
                                        </span>
                                        <ChevronIcon />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <footer className={styles.filterActions}>
                    <button type="button" onClick={onReset}>
                        Réinitialiser
                    </button>
                    <button type="submit" className={styles.primaryAction}>
                        Appliquer
                    </button>
                </footer>
            </form>
        </dialog>
    );
}
