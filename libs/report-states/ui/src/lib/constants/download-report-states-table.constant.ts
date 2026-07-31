import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

function calculateActionColumnWidth(actionCount: number): string {
    const width = Math.max(3, 0.5 + actionCount * 2.3);
    return `${width}rem`;
}

export const DOWNLOAD_REPORT_STATES_DIALOG_TABLE = {
    cols: [
        {
            field: 'name',
            header: 'REPORT_STATES.DOWNLOAD.DIALOG.TABLE.NAME',
            class: 'text-center',
            width: '11rem',
        },
        {
            field: 'value',
            header: 'REPORT_STATES.DOWNLOAD.DIALOG.TABLE.VALUE',
            class: 'text-center',
            width: '11rem',
        },
    ],
    globalFilterFields: ['name', 'value'],
};

export const DOWNLOAD_REPORT_STATES_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [{ id: 'download', icon: 'pi pi-download' }],
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '2rem',
        },
        {
            field: 'date',
            header: 'REPORT_STATES.DOWNLOAD.TABLE.DATE',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'name',
            header: 'REPORT_STATES.DOWNLOAD.TABLE.NAME',
            class: 'text-center',
            width: '11rem',
        },
        {
            field: 'typeLabel',
            header: 'REPORT_STATES.DOWNLOAD.TABLE.TYPE',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'size',
            header: 'REPORT_STATES.DOWNLOAD.TABLE.SIZE',
            class: 'text-center',
            width: '7rem',
        },
        {
            field: 'statusLabel',
            header: 'REPORT_STATES.DOWNLOAD.TABLE.STATUS',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'filtersCount',
            header: 'REPORT_STATES.DOWNLOAD.TABLE.FILTER',
            width: '5rem',
            class: 'text-center',
            type: 'badge-button',
        },
        {
            field: '__action',
            header: 'REPORT_STATES.DOWNLOAD.TABLE.ACTION',
            class: 'text-center',
            width: calculateActionColumnWidth(1),
        },
    ],
    globalFilterFields: [
        'date',
        'name',
        'typeLabel',
        'size',
        'statusLabel',
        'filtersCount',
    ],
};
