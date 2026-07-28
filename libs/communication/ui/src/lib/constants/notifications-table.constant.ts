import { TableColumn } from '@cmz/shared-ui';

export const NOTIFICATIONS_TABLE: {
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
            field: 'reference',
            header: 'COMMUNICATION.NOTIFICATIONS.TABLE.REFERENCE',
            width: '8rem',
        },
        {
            field: 'title',
            header: 'COMMUNICATION.NOTIFICATIONS.TABLE.TITLE',
            width: '14rem',
        },
        {
            field: 'message',
            header: 'COMMUNICATION.NOTIFICATIONS.TABLE.MESSAGE',
            width: '18rem',
        },
        {
            field: 'statusLabel',
            header: 'COMMUNICATION.NOTIFICATIONS.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'sendAt',
            header: 'COMMUNICATION.NOTIFICATIONS.TABLE.SEND_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'COMMUNICATION.NOTIFICATIONS.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: ['reference', 'title', 'message', 'statusLabel'],
};
