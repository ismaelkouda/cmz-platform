/**
 * Enum propre à `radio-relay-links` — **pas** de réutilisation de l'`Operator`
 * partagé (mobile-network/optical-fiber-network) : les valeurs diffèrent
 * (`MOOV`/`ORANGE` en majuscules ici, contre `Moov`/`Orange` ailleurs). Vérifié
 * en lisant le source (`radio-relay-links-operator.enum.ts`) avant de décider
 * — pas de fusion silencieuse d'enums aux valeurs incompatibles.
 */
export const RadioRelayLinksOperator = {
    MTN: 'MTN',
    MOOV: 'MOOV',
    ORANGE: 'ORANGE',
} as const;
export type RadioRelayLinksOperator =
    (typeof RadioRelayLinksOperator)[keyof typeof RadioRelayLinksOperator];

const RADIO_RELAY_LINKS_OPERATOR_VALUES = new Set<string>(
    Object.values(RadioRelayLinksOperator)
);

export function isRadioRelayLinksOperator(
    value: unknown
): value is RadioRelayLinksOperator {
    return (
        typeof value === 'string' &&
        RADIO_RELAY_LINKS_OPERATOR_VALUES.has(value)
    );
}
