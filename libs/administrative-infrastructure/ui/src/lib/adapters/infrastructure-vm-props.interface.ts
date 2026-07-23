import { ActionDropdownItem } from '@cmz/shared-ui';

export interface InfrastructureVmProps {
    uniqId: string;
    name: string;
    type: string;
    description: string;
    region: string;
    department: string;
    municipality: string;
    position: string;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
