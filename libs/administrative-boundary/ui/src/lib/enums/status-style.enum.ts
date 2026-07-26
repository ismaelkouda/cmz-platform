/**
 * Style d'affichage du statut — **concern UI** (exclu du domaine, cf. règle
 * kernel). Partagé par region/department/municipality (même `Status` enum
 * domaine unifié pour tout le module, cf. `enums/status.enum.ts`).
 */
export enum StatusStyle {
    ACTIVE = 'COMMON.ACTIVE_STYLE',
    INACTIVE = 'COMMON.INACTIVE_STYLE',
}
