import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const ALL_PROCESSING_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [
        {
            id: 'view',
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
            header: 'PROCESSING.ALL.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'PROCESSING.ALL.TABLE.REPORT_TYPE',
            width: '12rem',
        },
        {
            field: 'operatorsLabel',
            header: 'PROCESSING.ALL.TABLE.OPERATORS',
            width: '12rem',
        },
        {
            field: 'sourceLabel',
            header: 'PROCESSING.ALL.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'PROCESSING.ALL.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'PROCESSING.ALL.TABLE.ACTION',
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
