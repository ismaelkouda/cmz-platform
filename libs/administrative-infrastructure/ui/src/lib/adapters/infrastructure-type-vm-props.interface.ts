import { Status } from '@cmz/administrative-infrastructure-domain';
import { ActionDropdownItem, StatusStyle } from '@cmz/shared-ui';

export interface InfrastructureTypeVmProps {
    uniqId: string;
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
