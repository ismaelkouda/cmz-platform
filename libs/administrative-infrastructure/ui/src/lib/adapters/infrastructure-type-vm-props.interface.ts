import { Status } from '@cmz/administrative-infrastructure-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/infrastructure-type-status-style.enum';

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
