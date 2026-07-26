/**
 * Filtre de liste `department` — recherche + région (id) + plage de dates.
 * Aucun champ requis (jugé explicitement : le filtre top-level source n'a pas
 * de contrainte, contrairement à la vue imbriquée `municipalities-by-department-id`
 * qui, elle, impose l'id parent — cf. `department-filter.contract` nested).
 */
export interface DepartmentFilterContract {
    search?: string;
    regionId?: string;
    startDate?: Date;
    endDate?: Date;
}
