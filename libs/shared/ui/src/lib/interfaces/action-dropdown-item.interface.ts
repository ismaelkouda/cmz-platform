/**
 * Élément d'un menu d'actions (dropdown) — forme de présentation neutre,
 * consommée par les presenters de module et le composant action-dropdown.
 */
export interface ActionDropdownItem<T = unknown> {
    id: string;
    label: string;
    icon?: string;
    hidden?: boolean;
    disabled?: boolean;
    tooltip?: string;
    severity?: 'primary' | 'success' | 'warning' | 'danger';
    data?: T;
}
