import { TableColumn } from '@cmz/shared-ui';

export const NEWS_TABLE: {
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
            header: 'CONTENT_MANAGEMENT.NEWS.TABLE.TITLE',
            width: '14rem',
        },
        {
            field: 'category',
            header: 'CONTENT_MANAGEMENT.NEWS.TABLE.CATEGORY',
            width: '8rem',
        },
        {
            field: 'subCategory',
            header: 'CONTENT_MANAGEMENT.NEWS.TABLE.SUB_CATEGORY',
            width: '8rem',
        },
        {
            field: 'statusLabel',
            header: 'CONTENT_MANAGEMENT.NEWS.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'CONTENT_MANAGEMENT.NEWS.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'CONTENT_MANAGEMENT.NEWS.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'title',
        'category',
        'subCategory',
        'statusLabel',
        'updatedAt',
    ],
};
