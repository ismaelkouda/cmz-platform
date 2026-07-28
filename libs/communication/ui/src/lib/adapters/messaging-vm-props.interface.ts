import { ActionDropdownItem } from '@cmz/shared-ui';

export interface MessagingVmProps {
    uniqId: string;
    typeLabel: string;
    targetTypeLabel: string;
    channelsLabel: string;
    subject: string;
    content: string;
    createdAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
