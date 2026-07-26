import { Status } from '../enums/status.enum';

/**
 * Pas de champ `department` (scope déjà porté par le filtre parent
 * `departmentId`). Champ `region` du DTO source **désactivé côté UI**
 * (colonne commentée dans `MUNICIPALITIES_BY_DEPARTMENT_ID_TABLE_CONST`) →
 * non repris (ne pas reconstruire une colonne morte).
 */
export interface MunicipalitiesByDepartmentIdProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    populationSize: number;
    status: Status;
    createdAt: string;
    updatedAt: string;
}
