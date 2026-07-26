import { TableColumn } from '@cmz/shared-ui';

export const DEPARTMENT_TABLE: {
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
            header: 'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.TABLE.CODE',
            width: '6rem',
        },
        {
            field: 'name',
            header: 'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.TABLE.NAME',
            width: '12rem',
        },
        {
            field: 'regionName',
            header: 'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.TABLE.REGION',
            width: '12rem',
        },
        {
            field: 'municipalitiesCount',
            header: 'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.TABLE.MUNICIPALITIES_COUNT',
            class: 'text-center',
            width: '4rem',
        },
        {
            field: 'statusLabel',
            header: 'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'code',
        'name',
        'regionName',
        'statusLabel',
        'updatedAt',
    ],
};
