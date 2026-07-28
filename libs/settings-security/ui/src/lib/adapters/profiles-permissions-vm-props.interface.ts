import { ProfilesPermissionsStatus } from '@cmz/settings-security-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { ProfilesPermissionsStatusStyle } from '../enums/profiles-permissions-status-style.enum';

export interface ProfilesPermissionsVmProps {
    uniqId: string;
    name: string;
    slug: string;
    description: string;
    usersCount: number;
    status: ProfilesPermissionsStatus;
    statusLabel: string;
    statusStyle: ProfilesPermissionsStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
