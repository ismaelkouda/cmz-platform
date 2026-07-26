import { TableColumn } from '@cmz/shared-ui';

export const REGION_TABLE: {
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
            header: 'ADMINISTRATIVE_BOUNDARY.REGION.TABLE.CODE',
            width: '6rem',
        },
        {
            field: 'name',
            header: 'ADMINISTRATIVE_BOUNDARY.REGION.TABLE.NAME',
            width: '14rem',
        },
        {
            field: 'departmentsCount',
            header: 'ADMINISTRATIVE_BOUNDARY.REGION.TABLE.DEPARTMENTS_COUNT',
            class: 'text-center',
            width: '4rem',
        },
        {
            field: 'municipalitiesCount',
            header: 'ADMINISTRATIVE_BOUNDARY.REGION.TABLE.MUNICIPALITIES_COUNT',
            class: 'text-center',
            width: '4rem',
        },
        {
            field: 'statusLabel',
            header: 'ADMINISTRATIVE_BOUNDARY.REGION.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'ADMINISTRATIVE_BOUNDARY.REGION.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'ADMINISTRATIVE_BOUNDARY.REGION.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: ['code', 'name', 'statusLabel', 'updatedAt'],
};
