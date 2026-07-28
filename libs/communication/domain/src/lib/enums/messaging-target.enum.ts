/** Cible d'un message : un signalement précis (`REPORT`) ou une zone géographique (`AREA`). */
export const MessagingTarget = {
    REPORT: 'report',
    AREA: 'area',
} as const;

export type MessagingTarget =
    (typeof MessagingTarget)[keyof typeof MessagingTarget];
