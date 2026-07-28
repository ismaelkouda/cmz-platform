import { NotificationsStatus } from '@cmz/communication-domain';
import { NotificationsStatusStyle } from '../enums/notifications-status-style.enum';

const MAP: Record<NotificationsStatus, NotificationsStatusStyle> = {
    [NotificationsStatus.READ]: NotificationsStatusStyle.READ,
    [NotificationsStatus.UNREAD]: NotificationsStatusStyle.UNREAD,
};

/** Traduit un `NotificationsStatus` (domaine) en style d'affichage — logique UI. */
export function notificationsStatusStyleOf(
    status: NotificationsStatus
): NotificationsStatusStyle {
    return MAP[status];
}
