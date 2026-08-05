import { TableColumn, TableRowActionDefinition } from '@cmz/shared-ui';

export const AGENTS_PERFORMANCES_TABLE: {
    actions: TableRowActionDefinition[];
    cols: TableColumn[];
    globalFilterFields: string[];
} = {
    actions: [
        {
            id: 'view',
            icon: 'pi pi-eye',
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
            field: 'firstName',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.FIRST_NAME',
            width: '9rem',
        },
        {
            field: 'lastName',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.LAST_NAME',
            width: '9rem',
        },
        {
            field: 'goalsSize',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.GOALS_SIZE',
            width: '10rem',
            type: 'number',
        },
        {
            field: 'achievementsSize',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.ACHIEVEMENTS_SIZE',
            width: '10rem',
            type: 'number',
        },
        {
            field: 'percentages',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.PERCENTAGES',
            width: '10rem',
        },
        {
            field: 'statusLabel',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'createdAt',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.CREATED_AT',
            class: 'text-center',
            width: '9rem',
        },
        {
            field: '__action',
            header: 'TEAM_ORGANIZATION.AGENTS_PERFORMANCES.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'firstName',
        'lastName',
        'goalsSize',
        'achievementsSize',
        'percentages',
        'statusLabel',
        'createdAt',
    ],
};
