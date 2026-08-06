import { Status } from '@cmz/coverage-areas-domain';
import { ActionDropdownItem, StatusStyle } from '@cmz/shared-ui';

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
