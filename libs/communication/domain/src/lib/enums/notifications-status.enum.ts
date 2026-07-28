/**
 * Statut lu/non-lu d'une notification — codes wire stables (le source
 * utilise directement `'COMMON.READ'`/`'COMMON.UNREAD'` comme valeur
 * d'enum, même incohérence corrigée que `MessagingType` ci-dessus : le
 * style/la traduction vivent dans `notifications-status-style.mapper.ts`
 * (UI), pas dans l'enum domaine).
 */
export const NotificationsStatus = {
    READ: 'read',
    UNREAD: 'unread',
} as const;

export type NotificationsStatus =
    (typeof NotificationsStatus)[keyof typeof NotificationsStatus];
