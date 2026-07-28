import { SlideStatus } from '@cmz/content-management-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { SlideStatusStyle } from '../enums/slide-status-style.enum';

export interface SlideVmProps {
    uniqId: string;
    title: string;
    subtitle: string;
    status: SlideStatus;
    statusLabel: string;
    statusStyle: SlideStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
