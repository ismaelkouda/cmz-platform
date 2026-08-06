import { Operator, Status } from '@cmz/coverage-areas-domain';
import { ActionDropdownItem, StatusStyle } from '@cmz/shared-ui';

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
