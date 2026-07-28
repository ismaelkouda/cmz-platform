import { TableColumn } from '@cmz/shared-ui';

export const HOME_TABLE: {
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
            field: 'title',
            header: 'CONTENT_MANAGEMENT.HOME.TABLE.TITLE',
            width: '14rem',
        },
        {
            field: 'resume',
            header: 'CONTENT_MANAGEMENT.HOME.TABLE.RESUME',
            width: '18rem',
        },
        {
            field: 'statusLabel',
            header: 'CONTENT_MANAGEMENT.HOME.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'CONTENT_MANAGEMENT.HOME.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'CONTENT_MANAGEMENT.HOME.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: ['title', 'resume', 'statusLabel', 'updatedAt'],
};
