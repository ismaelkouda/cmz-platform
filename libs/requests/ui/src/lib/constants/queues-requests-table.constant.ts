import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const QUEUES_REQUESTS_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [{ id: 'take', icon: 'pi pi-window-maximize' }],
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '2rem',
        },
        {
            field: 'uniqId',
            header: 'REQUESTS.QUEUES.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'REQUESTS.QUEUES.TABLE.REPORT_TYPE',
            width: '11rem',
        },
        {
            field: 'operatorsLabel',
            header: 'REQUESTS.QUEUES.TABLE.OPERATORS',
            width: '10rem',
        },
        {
            field: 'sourceLabel',
            header: 'REQUESTS.QUEUES.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'REQUESTS.QUEUES.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'REQUESTS.QUEUES.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'uniqId',
        'reportTypeLabel',
        'operatorsLabel',
        'sourceLabel',
        'initiatorPhoneNumber',
        'reportedAt',
    ],
};
