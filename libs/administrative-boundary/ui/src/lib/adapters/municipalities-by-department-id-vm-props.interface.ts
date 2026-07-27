import { Status } from '@cmz/administrative-boundary-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/status-style.enum';

/**
 * Vue imbriquée en lecture seule : pas de colonne actions dans la table.
 * `dropdownActions` reste déclaré (optionnel, jamais renseigné) uniquement
 * pour satisfaire structurellement `TableRowBase` — cf.
 * `departments-by-region-id-vm-props.interface.ts`.
 */
export interface MunicipalitiesByDepartmentIdVmProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    populationSize: number;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    createdAt: string;
    updatedAt: string;
    dropdownActions?: ActionDropdownItem[];
}
