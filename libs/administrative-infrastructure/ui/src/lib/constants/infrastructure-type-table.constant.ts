import { TableColumn } from '@cmz/shared-ui';

export const INFRASTRUCTURE_TYPE_TABLE: {
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
            field: 'name',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TABLE.NAME',
            width: '7rem',
        },
        {
            field: 'description',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TABLE.DESCRIPTION',
            width: '20rem',
        },
        {
            field: 'statusLabel',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: ['name', 'description', 'statusLabel', 'updatedAt'],
};
