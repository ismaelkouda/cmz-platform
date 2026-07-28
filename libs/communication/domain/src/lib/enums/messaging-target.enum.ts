/** Cible d'un message : un signalement précis (`REPORT`) ou une zone géographique (`AREA`). */
export const MessagingTarget = {
    REPORT: 'report',
    AREA: 'area',
} as const;

export type MessagingTarget =
    (typeof MessagingTarget)[keyof typeof MessagingTarget];

const MESSAGING_TARGET_VALUES = new Set<string>(
    Object.values(MessagingTarget)
);

export function isMessagingTarget(value: unknown): value is MessagingTarget {
    return typeof value === 'string' && MESSAGING_TARGET_VALUES.has(value);
}
