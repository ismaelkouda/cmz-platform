import { NotificationsStatus } from '@cmz/communication-domain';

/** Clés i18n des libellés de statut lu/non-lu — présentation pure. */
export const NOTIFICATIONS_STATUS_LABEL: Record<NotificationsStatus, string> =
    {
        [NotificationsStatus.READ]: 'COMMON.READ',
        [NotificationsStatus.UNREAD]: 'COMMON.UNREAD',
    };
