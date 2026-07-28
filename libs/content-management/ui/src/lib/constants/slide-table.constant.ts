import { TableColumn } from '@cmz/shared-ui';

export const SLIDE_TABLE: {
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
            header: 'CONTENT_MANAGEMENT.SLIDE.TABLE.TITLE',
            width: '14rem',
        },
        {
            field: 'subtitle',
            header: 'CONTENT_MANAGEMENT.SLIDE.TABLE.SUBTITLE',
            width: '14rem',
        },
        {
            field: 'statusLabel',
            header: 'CONTENT_MANAGEMENT.SLIDE.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'CONTENT_MANAGEMENT.SLIDE.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'CONTENT_MANAGEMENT.SLIDE.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: ['title', 'subtitle', 'statusLabel', 'updatedAt'],
};
