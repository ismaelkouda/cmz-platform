/**
 * Type de message diffusé — 4 valeurs, codes wire stables (pas la clé de
 * traduction elle-même comme le fait le source :
 * `MessagingTypeEnum.TIP = 'COMMUNICATION.MESSAGING.ENUMS.TYPE.TIP'`,
 * incohérent avec la convention du reste du projet où l'enum domaine porte
 * un code métier et la traduction vit à part, cf.
 * `messaging-type-label.constant.ts`, UI).
 */
export const MessagingType = {
    TIP: 'tip',
    EDUCATION: 'education',
    INFO: 'info',
    AWARENESS: 'awareness',
} as const;

export type MessagingType = (typeof MessagingType)[keyof typeof MessagingType];
