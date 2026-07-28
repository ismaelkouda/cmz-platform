import { TypeReport } from '@cmz/shared-domain';
import { NotificationsStatus } from '@cmz/communication-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { NotificationsStatusStyle } from '../enums/notifications-status-style.enum';

export interface NotificationsVmProps {
    uniqId: string;
    reference: string;
    title: string;
    typeLabel: string;
    type: TypeReport;
    message: string;
    status: NotificationsStatus;
    statusLabel: string;
    statusStyle: NotificationsStatusStyle;
    sendAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
