import { NewsStatus } from '@cmz/content-management-domain';
import { ActionDropdownItem } from '@cmz/shared-ui';
import { NewsStatusStyle } from '../enums/news-status-style.enum';

export interface NewsVmProps {
    uniqId: string;
    title: string;
    category: string;
    subCategory: string;
    status: NewsStatus;
    statusLabel: string;
    statusStyle: NewsStatusStyle;
    updatedAt: string;
    actionsRef: string;
    dropdownActions: ActionDropdownItem[];
    disableDropdown: boolean;
    tooltipDropdown: string;
}
