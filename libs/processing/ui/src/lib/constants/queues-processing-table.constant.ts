import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const QUEUES_PROCESSING_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [
        {
            id: 'take',
            icon: 'pi pi-window-maximize',
        },
    ],
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '2rem',
        },
        {
            field: 'uniqId',
            header: 'PROCESSING.QUEUES.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'PROCESSING.QUEUES.TABLE.REPORT_TYPE',
            width: '11rem',
        },
        {
            field: 'operatorsLabel',
            header: 'PROCESSING.QUEUES.TABLE.OPERATORS',
            width: '10rem',
        },
        {
            field: 'sourceLabel',
            header: 'PROCESSING.QUEUES.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'PROCESSING.QUEUES.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'PROCESSING.QUEUES.TABLE.ACTION',
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
