/**
 * Opérateur télécom — codes stables = wire API.
 * Labels / styles badge : @cmz/shared-ui.
 */
export const TelecomOperator = {
    MTN: 'mtn',
    ORANGE: 'orange',
    MOOV: 'moov',
} as const;

export type TelecomOperator =
    (typeof TelecomOperator)[keyof typeof TelecomOperator];

const VALUES = new Set<string>(Object.values(TelecomOperator));

export function isTelecomOperator(value: string): value is TelecomOperator {
    return VALUES.has(value);
}
