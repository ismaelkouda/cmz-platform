import { ActionDropdownItem } from './action-dropdown-item.interface';
import { TableRowActionButtonState } from './table-row-action.interface';

/**
 * Contrat minimal d'une ligne de `cmz-table` : actions dropdown ou boutons.
 */
export interface TableRowBase {
    dropdownActions?: ActionDropdownItem[];
    disableDropdown?: boolean;
    tooltipDropdown?: string;
    /** Boutons `__action` — clé = `TableRowActionDefinition.id`. */
    actionButtons?: Record<string, TableRowActionButtonState>;
}
