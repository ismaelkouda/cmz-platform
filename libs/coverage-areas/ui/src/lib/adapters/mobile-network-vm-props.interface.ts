import { Operator, Status } from '@cmz/coverage-areas-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/site-group-status-style.enum';

export interface MobileNetworkVmProps {
    uniqId: string;
    siteId: string;
    siteName: string;
    towerTypeId: string;
    towerTypeName: string;
    towerSize: number;
    technology: string;
    operator: Operator;
    radius?: number;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
