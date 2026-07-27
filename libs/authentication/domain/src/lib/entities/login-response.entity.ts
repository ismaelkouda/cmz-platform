import { AuthToken, CurrentUser } from '@cmz/shared-domain';
import { LoginProps } from '../props/login.props';

/**
 * Réponse d'action one-shot : pas d'identité stable (pas d'`uniqId`), donc pas
 * de `with()`/cache d'identité côté mapper — cette optimisation (cf.
 * `RegionEntity`) sert la réconciliation de ressources re-fetchées, sans objet
 * ici (un login n'est jamais « re-GET »).
 */
export class LoginResponseEntity {
    constructor(private readonly props: LoginProps) {}

    get user(): CurrentUser {
        return this.props.user;
    }

    get token(): AuthToken {
        return this.props.token;
    }

    get message(): string | undefined {
        return this.props.message;
    }
}
