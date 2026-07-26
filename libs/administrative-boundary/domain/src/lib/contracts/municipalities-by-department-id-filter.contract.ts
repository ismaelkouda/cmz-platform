/**
 * Filtre de la vue imbriquée « communes d'un département ». `departmentId`
 * requis (scope parent, même mécanisme que `departments-by-region-id`).
 * Champs `region`/`department`/`status` du `FormGroup` source présents mais
 * **absents de `filterFields`** (jamais rendus dans le composant) → non
 * repris (ne pas reconstruire un champ mort).
 */
export interface MunicipalitiesByDepartmentIdFilterContract {
    departmentId?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
}
