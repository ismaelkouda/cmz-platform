import { Status } from '@cmz/administrative-boundary-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/status-style.enum';

export interface RegionVmProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    populationSize: number;
    infrastructureCount: number;
    departmentsCount: number;
    municipalitiesCount: number;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
