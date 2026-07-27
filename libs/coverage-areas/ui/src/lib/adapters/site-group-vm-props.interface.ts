import { Status } from '@cmz/coverage-areas-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/site-group-status-style.enum';

export interface SiteGroupVmProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
