import { TableColumn } from '@cmz/shared-ui';

export const INFRASTRUCTURE_TABLE: {
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
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.NAME',
            width: '7rem',
        },
        {
            field: 'type',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.TYPE',
            width: '7rem',
        },
        {
            field: 'region',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.REGION',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'department',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.DEPARTMENT',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'municipality',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.MUNICIPALITY',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'position',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.POSITION',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '7rem',
        },
        {
            field: '__actionDropdown',
            header: 'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'name',
        'type',
        'description',
        'region',
        'department',
        'municipality',
        'updatedAt',
    ],
};
