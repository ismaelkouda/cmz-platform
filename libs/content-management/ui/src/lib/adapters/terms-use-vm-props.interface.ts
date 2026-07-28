import { TermsUseStatus } from '@cmz/content-management-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { TermsUseStatusStyle } from '../enums/terms-use-status-style.enum';

export interface TermsUseVmProps {
    uniqId: string;
    version: string;
    status: TermsUseStatus;
    statusLabel: string;
    statusStyle: TermsUseStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
