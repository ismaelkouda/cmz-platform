/**
 * Résultat paginé neutre (modèle domaine), indépendant de la forme réseau.
 * La couche `data` traduit l'enveloppe de pagination du transport vers ce type.
 */
export interface PageResult<T> {
    items: T[];
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
}
