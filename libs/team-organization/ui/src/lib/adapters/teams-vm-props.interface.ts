import { TeamsStatus } from '@cmz/team-organization-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { TeamsStatusStyle } from '../enums/teams-status-style.enum';

export interface TeamsVmProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    membersCount: string;
    status: TeamsStatus;
    statusLabel: string;
    statusStyle: TeamsStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
