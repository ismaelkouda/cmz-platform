import { Status } from '@cmz/administrative-boundary-domain';
import { StatusStyle } from '../enums/status-style.enum';

/**
 * Vue imbriquée en lecture seule : pas de `dropdownActions`/`actionsRef`
 * (aucune action — la colonne `__actionDropdown` du tableau source est
 * commentée, ne pas la reconstruire).
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
}
