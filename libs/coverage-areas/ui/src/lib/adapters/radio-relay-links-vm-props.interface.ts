import {
    RadioRelayLinksFrequency,
    RadioRelayLinksOperator,
    Status,
} from '@cmz/coverage-areas-domain';
import { ActionDropdownItem, StatusStyle } from '@cmz/shared-ui';

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
