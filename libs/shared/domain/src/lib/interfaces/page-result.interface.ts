import { PaginationMeta } from './pagination-meta.interface';

/**
 * Résultat paginé neutre (modèle domaine), indépendant de la forme réseau :
 * les items + les métadonnées de pagination ([[PaginationMeta]]). La couche
 * `data` traduit l'enveloppe de pagination du transport vers ce type.
 */
export interface PageResult<T> extends PaginationMeta {
    items: T[];
}
