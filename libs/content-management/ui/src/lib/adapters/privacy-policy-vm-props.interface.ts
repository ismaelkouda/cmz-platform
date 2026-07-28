import { PrivacyPolicyStatus } from '@cmz/content-management-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { PrivacyPolicyStatusStyle } from '../enums/privacy-policy-status-style.enum';

export interface PrivacyPolicyVmProps {
    uniqId: string;
    version: string;
    status: PrivacyPolicyStatus;
    statusLabel: string;
    statusStyle: PrivacyPolicyStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
