/**
 * Wire status — mêmes 4 valeurs que `UsersStatus` (domaine), aucune
 * translittération nécessaire (`isUsersStatus` sert de guard directement
 * sur la valeur wire, cf. `team-organization/participants` pour le même
 * précédent).
 */
export type UsersStatusApiDto = 'active' | 'inactive' | 'blocked' | 'pending';
