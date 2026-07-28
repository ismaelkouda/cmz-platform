import { TableColumn } from '@cmz/shared-ui';

export const TEAMS_TABLE: {
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
            field: 'code',
            header: 'TEAM_ORGANIZATION.TEAMS.TABLE.CODE',
            width: '6rem',
        },
        {
            field: 'name',
            header: 'TEAM_ORGANIZATION.TEAMS.TABLE.NAME',
            width: '8rem',
        },
        {
            field: 'description',
            header: 'TEAM_ORGANIZATION.TEAMS.TABLE.DESCRIPTION',
            width: '18rem',
        },
        {
            field: 'membersCount',
            header: 'TEAM_ORGANIZATION.TEAMS.TABLE.MEMBERS_COUNT',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'statusLabel',
            header: 'TEAM_ORGANIZATION.TEAMS.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'TEAM_ORGANIZATION.TEAMS.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'TEAM_ORGANIZATION.TEAMS.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'code',
        'name',
        'description',
        'membersCount',
        'statusLabel',
        'updatedAt',
    ],
};
