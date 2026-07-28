import { Role } from '@cmz/shared-domain';
import { UsersStatus } from '@cmz/settings-security-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { UsersStatusStyle } from '../enums/users-status-style.enum';

export interface UsersVmProps {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role | null;
    roleLabel: string;
    profile: string;
    status: UsersStatus;
    statusLabel: string;
    statusStyle: UsersStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
