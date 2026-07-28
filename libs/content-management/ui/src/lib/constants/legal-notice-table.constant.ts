import { TableColumn } from '@cmz/shared-ui';

export const LEGAL_NOTICE_TABLE: {
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
            field: 'version',
            header: 'CONTENT_MANAGEMENT.LEGAL_NOTICE.TABLE.VERSION',
            width: '6rem',
        },
        {
            field: 'statusLabel',
            header: 'CONTENT_MANAGEMENT.LEGAL_NOTICE.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'CONTENT_MANAGEMENT.LEGAL_NOTICE.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'CONTENT_MANAGEMENT.LEGAL_NOTICE.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: ['version', 'statusLabel', 'updatedAt'],
};
