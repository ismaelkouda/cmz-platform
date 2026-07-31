import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const TASKS_FINALIZATION_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [{ id: 'finalize', icon: 'pi pi-check-circle' }],
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '2rem',
        },
        {
            field: 'uniqId',
            header: 'FINALIZATION.TASKS.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'FINALIZATION.TASKS.TABLE.REPORT_TYPE',
            width: '11rem',
        },
        {
            field: 'operatorsLabel',
            header: 'FINALIZATION.TASKS.TABLE.OPERATORS',
            width: '10rem',
        },
        {
            field: 'sourceLabel',
            header: 'FINALIZATION.TASKS.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'FINALIZATION.TASKS.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'FINALIZATION.TASKS.TABLE.ACTION',
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
