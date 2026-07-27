import { TableColumn } from '@cmz/shared-ui';

export const MOBILE_NETWORK_TABLE: {
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '2rem',
        },
        {
            field: 'siteId',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.SITE_ID',
            width: '7rem',
        },
        {
            field: 'siteName',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.SITE_NAME',
            width: '10rem',
        },
        {
            field: 'towerTypeName',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.TOWER_TYPE',
            width: '8rem',
        },
        {
            field: 'towerSize',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.TOWER_SIZE',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'technology',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.TECHNOLOGY',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'operator',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.OPERATOR',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'radius',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.RADIUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'statusLabel',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'COVERAGE_AREAS.MOBILE_NETWORK.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'siteId',
        'siteName',
        'towerTypeName',
        'technology',
        'operator',
        'statusLabel',
        'updatedAt',
    ],
};
