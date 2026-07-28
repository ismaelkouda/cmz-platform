/**
 * Fenêtre glissante (en jours) sur laquelle les statistiques du tableau de
 * bord sont calculées — 4 valeurs fixes côté source (`period.const.ts`),
 * reprises ici comme enum wire-first (codes stables, mêmes valeurs que le
 * wire : le filtre est sérialisé en `number` côté API mais les codes eux-
 * mêmes ne changent pas).
 */
export const Period = {
    SEVEN_DAYS: '7',
    THIRTY_DAYS: '30',
    SIXTY_DAYS: '60',
    NINETY_DAYS: '90',
} as const;

export type Period = (typeof Period)[keyof typeof Period];

const PERIOD_VALUES = new Set<string>(Object.values(Period));

export function isPeriod(value: unknown): value is Period {
    return typeof value === 'string' && PERIOD_VALUES.has(value);
}
