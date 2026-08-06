import { TableColumn } from '@cmz/shared-ui';

export const AGENTS_PERFORMANCES_HISTORY_TABLE: {
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    cols: [
        {
            field: '__index',
            header: 'COMMON.INDEX',
            class: 'text-center',
            width: '2rem',
        },
        {
            field: 'reportType',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.HISTORY.TABLE.REPORT_TYPE',
            width: '11rem',
        },
        {
            field: 'operators',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.HISTORY.TABLE.OPERATORS',
            width: '10rem',
        },
        {
            field: 'source',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.HISTORY.TABLE.SOURCE',
            width: '12rem',
        },
        {
            field: 'initiatorPhoneNumber',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.HISTORY.TABLE.INITIATOR',
            width: '10rem',
        },
        {
            field: 'createdAt',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.HISTORY.TABLE.CREATED_AT',
            class: 'text-center',
            width: '8rem',
        },
    ],
    globalFilterFields: [
        'reportType',
        'operators',
        'source',
        'initiatorPhoneNumber',
        'createdAt',
    ],
};
