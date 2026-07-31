import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const ALL_FINALIZATION_TABLE: {
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
            header: 'FINALIZATION.ALL.TABLE.UNIQ_ID',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: 'reportTypeLabel',
            header: 'FINALIZATION.ALL.TABLE.REPORT_TYPE',
            width: '12rem',
        },
        {
            field: 'operatorsLabel',
            header: 'FINALIZATION.ALL.TABLE.OPERATORS',
            width: '12rem',
        },
        {
            field: 'sourceLabel',
            header: 'FINALIZATION.ALL.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'reportedAt',
            header: 'FINALIZATION.ALL.TABLE.REPORTED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__action',
            header: 'FINALIZATION.ALL.TABLE.ACTION',
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
