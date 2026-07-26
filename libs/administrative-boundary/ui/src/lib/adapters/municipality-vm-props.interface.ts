import { Status } from '@cmz/administrative-boundary-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/status-style.enum';

export interface MunicipalityVmProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    regionId: string;
    regionName: string;
    departmentId: string;
    departmentName: string;
    populationSize: number;
    infrastructureCount: number;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
