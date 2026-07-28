import { TableColumn } from '@cmz/shared-ui';

export const MESSAGING_TABLE: {
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
            field: 'typeLabel',
            header: 'COMMUNICATION.MESSAGING.TABLE.TYPE',
            width: '7rem',
        },
        {
            field: 'targetTypeLabel',
            header: 'COMMUNICATION.MESSAGING.TABLE.TARGET_TYPE',
            width: '7rem',
        },
        {
            field: 'channelsLabel',
            header: 'COMMUNICATION.MESSAGING.TABLE.CHANNELS',
            width: '7rem',
        },
        {
            field: 'subject',
            header: 'COMMUNICATION.MESSAGING.TABLE.SUBJECT',
            width: '10rem',
        },
        {
            field: 'createdAt',
            header: 'COMMUNICATION.MESSAGING.TABLE.CREATED_AT',
            class: 'text-center',
            width: '7rem',
        },
        {
            field: '__actionDropdown',
            header: 'COMMUNICATION.MESSAGING.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'typeLabel',
        'targetTypeLabel',
        'channelsLabel',
        'subject',
        'createdAt',
    ],
};
