import { Status } from '@cmz/administrative-infrastructure-domain';

/**
 * Style d'affichage du statut — **concern UI** (exclu du domaine, cf. règle
 * kernel). Le mapping `Status → StatusStyle` est calculé ici, pas sur l'entité.
 */
export enum StatusStyle {
    ACTIVE = 'COMMON.ACTIVE_STYLE',
    INACTIVE = 'COMMON.INACTIVE_STYLE',
}

export function statusStyleOf(status: Status): StatusStyle {
    return status === Status.ACTIVE ? StatusStyle.ACTIVE : StatusStyle.INACTIVE;
}
