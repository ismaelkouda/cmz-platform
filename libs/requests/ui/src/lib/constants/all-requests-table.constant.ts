import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const ALL_REQUESTS_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [{ id: 'view', icon: 'pi pi-window-maximize' }],
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '2rem',
        },
        {
            field: 'uniqId',
            header: 'REQUESTS.ALL.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'REQUESTS.ALL.TABLE.REPORT_TYPE',
            width: '12rem',
        },
        {
            field: 'operatorsLabel',
            header: 'REQUESTS.ALL.TABLE.OPERATORS',
            width: '12rem',
        },
        {
            field: 'sourceLabel',
            header: 'REQUESTS.ALL.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'REQUESTS.ALL.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'REQUESTS.ALL.TABLE.ACTION',
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
