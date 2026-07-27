import { Status } from '@cmz/administrative-boundary-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/status-style.enum';

/**
 * Vue imbriquée en lecture seule : pas d'`actionsRef` ni de colonne actions
 * dans la table (aucune action — la colonne `__actionDropdown` du tableau
 * source est commentée, ne pas la reconstruire). `dropdownActions` reste
 * déclaré (optionnel, jamais renseigné) uniquement pour satisfaire
 * structurellement `TableRowBase` — `cmz-table` ne le lit que si la colonne
 * `__actionDropdown` est présente dans `columns()`, ce qui n'est pas le cas ici.
 */
export interface DepartmentsByRegionIdVmProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    populationSize: number;
    municipalitiesCount: number;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    createdAt: string;
    updatedAt: string;
    dropdownActions?: ActionDropdownItem[];
}
