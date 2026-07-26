import { TableColumn } from '@cmz/shared-ui';

export const MUNICIPALITY_TABLE: {
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
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.TABLE.CODE',
            width: '6rem',
        },
        {
            field: 'name',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.TABLE.NAME',
            width: '12rem',
        },
        {
            field: 'regionName',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.TABLE.REGION',
            width: '10rem',
        },
        {
            field: 'departmentName',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.TABLE.DEPARTMENT',
            width: '10rem',
        },
        {
            field: 'statusLabel',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'code',
        'name',
        'regionName',
        'departmentName',
        'statusLabel',
        'updatedAt',
    ],
};
