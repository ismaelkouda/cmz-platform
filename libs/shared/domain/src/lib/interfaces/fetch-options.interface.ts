/**
 * Intention de requête neutre : forcer un rafraîchissement plutôt que servir un cache.
 * Concept domaine (capacité d'un repository), sans dépendance transport.
 */
export interface FetchOptions {
    forceRefresh?: boolean;
}
