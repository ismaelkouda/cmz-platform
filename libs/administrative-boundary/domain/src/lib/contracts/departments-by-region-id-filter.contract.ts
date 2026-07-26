/**
 * Filtre de la vue imbriquée « départements d'une région ». `regionId` est
 * **requis** (sans lui la requête n'a pas de sens) — jugé explicitement comme
 * un champ de formulaire requis, cf. `.validate-contract` + validator
 * (`GenericRequiredError`, même mécanisme que create/update). Champs
 * `municipality` (commenté) et `status` (présent dans le `FormGroup` source
 * mais absent de `filterFields`, donc jamais rendu ni saisissable) **morts
 * côté UI** → non repris (ne pas reconstruire un champ mort).
 */
export interface DepartmentsByRegionIdFilterContract {
    regionId?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
}
