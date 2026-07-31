import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const CLOSE_REPORT_STATES_TABLE: {
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
            header: 'REPORT_STATES.CLOSE.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'REPORT_STATES.CLOSE.TABLE.REPORT_TYPE',
            width: '12rem',
        },
        {
            field: 'operatorsLabel',
            header: 'REPORT_STATES.CLOSE.TABLE.OPERATORS',
            width: '12rem',
        },
        {
            field: 'sourceLabel',
            header: 'REPORT_STATES.CLOSE.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'REPORT_STATES.CLOSE.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'REPORT_STATES.CLOSE.TABLE.ACTION',
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
