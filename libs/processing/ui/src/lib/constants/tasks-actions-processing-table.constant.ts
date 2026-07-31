import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const TASKS_ACTIONS_PROCESSING_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [
        { id: 'edit', icon: 'pi pi-pencil' },
        { id: 'view', icon: 'pi pi-eye' },
        { id: 'delete', icon: 'pi pi-trash' },
    ],
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '3rem',
        },
        {
            field: 'date',
            header: 'PROCESSING.TASKS.ACTIONS.TABLE.DATE_ACTION',
            width: '8rem',
            class: 'text-center',
        },
        {
            field: 'type',
            header: 'PROCESSING.TASKS.ACTIONS.TABLE.TYPE',
            width: '12rem',
        },
        {
            field: 'operatorsLabel',
            header: 'PROCESSING.TASKS.ACTIONS.TABLE.OPERATORS',
            width: '6rem',
            class: 'text-center',
        },
        {
            field: 'description',
            header: 'PROCESSING.TASKS.ACTIONS.TABLE.DESCRIPTION',
            width: '12rem',
        },
        {
            field: 'createdBy',
            header: 'PROCESSING.TASKS.ACTIONS.TABLE.CREATED_BY',
            width: '8rem',
            class: 'text-center',
        },
        {
            field: 'conformLabel',
            header: 'PROCESSING.TASKS.ACTIONS.TABLE.CONFORMITY',
            width: '6rem',
            class: 'text-center',
        },
        {
            field: '__action',
            header: 'PROCESSING.TASKS.TABLE.ACTION',
            class: 'text-center',
            width: '8rem',
        },
    ],
    globalFilterFields: [
        'date',
        'type',
        'operatorsLabel',
        'description',
        'createdBy',
        'conformLabel',
    ],
};
