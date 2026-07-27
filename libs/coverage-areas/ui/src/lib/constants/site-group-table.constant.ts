import { TableColumn } from '@cmz/shared-ui';

export const SITE_GROUP_TABLE: {
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
            field: 'code',
            header: 'COVERAGE_AREAS.SITE_GROUP.TABLE.CODE',
            width: '6rem',
        },
        {
            field: 'name',
            header: 'COVERAGE_AREAS.SITE_GROUP.TABLE.NAME',
            width: '7rem',
        },
        {
            field: 'description',
            header: 'COVERAGE_AREAS.SITE_GROUP.TABLE.DESCRIPTION',
            width: '20rem',
        },
        {
            field: 'statusLabel',
            header: 'COVERAGE_AREAS.SITE_GROUP.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'COVERAGE_AREAS.SITE_GROUP.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'COVERAGE_AREAS.SITE_GROUP.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'code',
        'name',
        'description',
        'statusLabel',
        'updatedAt',
    ],
};
