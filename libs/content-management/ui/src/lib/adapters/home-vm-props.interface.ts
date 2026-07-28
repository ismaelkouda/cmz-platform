import { HomeStatus } from '@cmz/content-management-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { HomeStatusStyle } from '../enums/home-status-style.enum';

export interface HomeVmProps {
    uniqId: string;
    title: string;
    resume: string;
    status: HomeStatus;
    statusLabel: string;
    statusStyle: HomeStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
