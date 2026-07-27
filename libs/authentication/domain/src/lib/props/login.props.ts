import { AuthToken, CurrentUser } from '@cmz/shared-domain';

/**
 * Seule `login` retourne réellement une session (`user`/`token`) — cf.
 * décision 1 du plan : `forgot-password`/`reset-password` ne l'ont jamais
 * consommée dans le source, donc pas reproduite pour elles.
 */
export interface LoginProps {
    readonly user: CurrentUser;
    readonly token: AuthToken;
    readonly message?: string;
}
