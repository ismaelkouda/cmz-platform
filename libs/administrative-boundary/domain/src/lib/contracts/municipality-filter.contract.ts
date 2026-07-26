/**
 * Filtre de liste `municipality` — recherche + région/département (ids) +
 * plage de dates. `status` présent dans le `FormGroup` source mais **commenté
 * / absent de `filterFields`** (jamais rendu) → non repris (champ mort). Aucun
 * champ requis (jugé explicitement, comme `region`/`department` filters).
 */
export interface MunicipalityFilterContract {
    search?: string;
    regionId?: string;
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
}
