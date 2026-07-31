import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const APPROVE_REPORT_STATES_TABLE: {
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
            header: 'REPORT_STATES.APPROVE.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'REPORT_STATES.APPROVE.TABLE.REPORT_TYPE',
            width: '11rem',
        },
        {
            field: 'operatorsLabel',
            header: 'REPORT_STATES.APPROVE.TABLE.OPERATORS',
            width: '10rem',
        },
        {
            field: 'sourceLabel',
            header: 'REPORT_STATES.APPROVE.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'REPORT_STATES.APPROVE.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'REPORT_STATES.APPROVE.TABLE.ACTION',
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
