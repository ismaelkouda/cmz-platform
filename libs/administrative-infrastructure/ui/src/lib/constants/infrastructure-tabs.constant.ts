import { TabLink } from '../interfaces/tab-link.interface';
import { ADMINISTRATIVE_INFRASTRUCTURE_ROUTE } from './administrative-infrastructure-paths.constant';
import {
    INFRASTRUCTURE_HISTORY,
    INFRASTRUCTURE_LIST,
    INFRASTRUCTURE_ROUTE,
} from './infrastructure-paths.constant';

export const ADMINISTRATIVE_TABS: TabLink[] = [
    {
        value: '0',
        route: `/${ADMINISTRATIVE_INFRASTRUCTURE_ROUTE}/${INFRASTRUCTURE_ROUTE}/${INFRASTRUCTURE_LIST}`,
        label: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABS.INFRASTRUCTURE.LABEL',
        icon: 'pi pi-list',
    },
    {
        value: '1',
        route: `/${ADMINISTRATIVE_INFRASTRUCTURE_ROUTE}/${INFRASTRUCTURE_ROUTE}/${INFRASTRUCTURE_HISTORY}`,
        label: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABS.HISTORY.LABEL',
        icon: 'pi pi-history',
        queryParams: { ref: 'equipments' },
    },
];
