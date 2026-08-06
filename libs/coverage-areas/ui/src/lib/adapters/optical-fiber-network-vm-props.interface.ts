import { FiberType, Operator, Status } from '@cmz/coverage-areas-domain';
import { ActionDropdownItem, StatusStyle } from '@cmz/shared-ui';

export interface OpticalFiberNetworkVmProps {
    uniqId: string;
    name: string;
    operator: Operator;
    fiberConstructorId: string;
    fiberConstructorName: string;
    type: FiberType;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
