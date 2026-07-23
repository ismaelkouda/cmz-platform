/**
 * Métadonnées de pagination neutres (modèle domaine). Contrat commun à la
 * couche data (traduction de l'enveloppe réseau) et à l'UI (composant de
 * pagination).
 */
export interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
}
