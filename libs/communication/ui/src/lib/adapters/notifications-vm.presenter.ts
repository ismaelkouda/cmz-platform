import {
    NotificationsEntity,
    NotificationsStatus,
} from '@cmz/communication-domain';
import { actionItem, resolveTooltip, TYPE_REPORT_LABEL } from '@cmz/shared-ui';
import { NOTIFICATIONS_STATUS_LABEL } from '../constants/notifications-status-label.constant';
import { notificationsStatusStyleOf } from '../mappers/notifications-status-style.mapper';
import { NotificationsVmProps } from './notifications-vm-props.interface';

interface NotificationsPermission {
    authorization: {
        canRead: boolean;
    };
    tooltip: {
        read: string;
    };
}

const T = 'COMMUNICATION.NOTIFICATIONS.TOOLTIP';

/**
 * Presenter (UI) : `NotificationsEntity` → view-model. Une seule action de
 * ligne — « marquer comme lu » — proposée uniquement quand `status ===
 * UNREAD` (cf. décision : le dialogue de détail du source était un stub
 * (`ManagementDialogComponent` non câblé) et le repository `find-one`
 * associé n'était appelé nulle part ; remplacé ici par l'action réelle
 * `readOne`, déjà fonctionnelle côté backend).
 */
export class NotificationsPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: NotificationsEntity,
        permission: NotificationsPermission
    ): NotificationsVmProps {
        const { authorization: can, tooltip } = permission;
        const isUnread = item.status === NotificationsStatus.UNREAD;

        return {
            uniqId: item.uniqId,
            reference: item.reference,
            title: item.title,
            type: item.type,
            typeLabel: this.t(TYPE_REPORT_LABEL[item.type]),
            message: item.message,
            status: item.status,
            statusLabel: this.t(NOTIFICATIONS_STATUS_LABEL[item.status]),
            statusStyle: notificationsStatusStyleOf(item.status),
            sendAt: item.sendAt,
            actionsRef: item.title,
            dropdownActions: [
                actionItem(this.t, {
                    id: 'markAsRead',
                    label: 'COMMUNICATION.NOTIFICATIONS.TABLE.READ',
                    icon: 'pi pi-check',
                    allowed: can.canRead && isUnread,
                    tooltipKey: `${T}.READ`,
                    fallbackTooltip: tooltip.read,
                }),
            ],
            disableDropdown: !can.canRead || !isUnread,
            tooltipDropdown: !isUnread
                ? this.t(`${T}.ALREADY_READ`)
                : resolveTooltip(
                      this.t,
                      can.canRead,
                      `${T}.CHOOSE`,
                      tooltip.read
                  ),
        };
    }
}
