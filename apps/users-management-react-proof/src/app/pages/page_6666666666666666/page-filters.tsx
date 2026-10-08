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

interface UsersFilterPanelProps {
    readonly filters: UsersFilterForm;
    readonly profiles: readonly ProfileOption[];
    readonly onChange: (filters: UsersFilterForm) => void;
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

export function UsersFilterPanel({
    filters,
    profiles,
    onChange,
    onReset,
    onApply,
}: UsersFilterPanelProps) {
    return (
        <aside
            id="users-filter-panel"
            className={styles.filterPanel}
            aria-label="Filtres des utilisateurs"
        >
            <div className={styles.filterFields}>
                <label>
                    Profil
                    <select
                        value={filters.profile}
                        onChange={(event) =>
                            onChange({
                                ...filters,
                                profile: event.target.value,
                            })
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
                <label>
                    Rôle
                    <select
                        value={filters.role}
                        onChange={(event) =>
                            onChange({
                                ...filters,
                                role: event.target.value,
                            })
                        }
                    >
                        <option value="">Tous les rôles</option>
                        <option value="supervisor">Superviseur</option>
                        <option value="team-leader">Chef d’équipe</option>
                        <option value="agent">Agent</option>
                    </select>
                </label>
                <fieldset>
                    <legend>Statut</legend>
                    <label>
                        <input
                            type="radio"
                            name="status"
                            value=""
                            checked={!filters.status}
                            onChange={() =>
                                onChange({ ...filters, status: '' })
                            }
                        />{' '}
                        Tous
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="status"
                            value="active"
                            checked={filters.status === 'active'}
                            onChange={() =>
                                onChange({ ...filters, status: 'active' })
                            }
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
