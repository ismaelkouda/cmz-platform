import { ActionDropdownItem } from './action-dropdown-item.interface';

/**
 * Contrat minimal d'une ligne de `cmz-table` : les actions de ligne
 * (optionnelles). Les view-models de module (ex. `*VmProps`) le satisfont
 * structurellement ; l'accès aux cellules par `field` est interne au composant.
 */
export interface TableRowBase {
    dropdownActions?: ActionDropdownItem[];
    disableDropdown?: boolean;
    tooltipDropdown?: string;
}
