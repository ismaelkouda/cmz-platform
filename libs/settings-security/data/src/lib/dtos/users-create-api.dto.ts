/**
 * Pas de `role` : champ mort en écriture côté source (commenté dans
 * `UsersCreateApiDto`/`UsersUpdateApiDto` — API en lecture seule pour ce
 * champ), confirmé par lecture directe du source.
 */
export interface UsersCreateApiDto {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profile_id: string;
}
