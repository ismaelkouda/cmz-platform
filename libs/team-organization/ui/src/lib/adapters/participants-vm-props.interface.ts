import { Role } from '@cmz/shared-domain';
import { ParticipantsStatus } from '@cmz/team-organization-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { ParticipantsStatusStyle } from '../enums/participants-status-style.enum';

export interface ParticipantsVmProps {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role | null;
    roleLabel: string;
    team: string | null;
    status: ParticipantsStatus;
    statusLabel: string;
    statusStyle: ParticipantsStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
