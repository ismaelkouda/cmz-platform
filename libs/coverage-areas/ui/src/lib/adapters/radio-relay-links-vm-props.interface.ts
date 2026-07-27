import {
    RadioRelayLinksFrequency,
    RadioRelayLinksOperator,
    Status,
} from '@cmz/coverage-areas-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { StatusStyle } from '../enums/site-group-status-style.enum';

export interface RadioRelayLinksVmProps {
    uniqId: string;
    name: string;
    operator: RadioRelayLinksOperator;
    frequency: RadioRelayLinksFrequency;
    startDate: string;
    endDate: string;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
