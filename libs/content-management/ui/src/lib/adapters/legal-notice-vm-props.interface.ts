import { LegalNoticeStatus } from '@cmz/content-management-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { LegalNoticeStatusStyle } from '../enums/legal-notice-status-style.enum';

export interface LegalNoticeVmProps {
    uniqId: string;
    version: string;
    status: LegalNoticeStatus;
    statusLabel: string;
    statusStyle: LegalNoticeStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
