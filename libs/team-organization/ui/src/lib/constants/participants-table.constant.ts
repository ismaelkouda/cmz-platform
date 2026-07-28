import { TableColumn } from '@cmz/shared-ui';

export const PARTICIPANTS_TABLE: {
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
            field: 'firstName',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.FIRST_NAME',
            width: '7rem',
        },
        {
            field: 'lastName',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.LAST_NAME',
            width: '7rem',
        },
        {
            field: 'email',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.EMAIL',
            width: '12rem',
        },
        {
            field: 'phone',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.PHONE',
            width: '8rem',
        },
        {
            field: 'roleLabel',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.ROLE',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'team',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.TEAM',
            width: '8rem',
        },
        {
            field: 'statusLabel',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'TEAM_ORGANIZATION.PARTICIPANTS.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'firstName',
        'lastName',
        'email',
        'phone',
        'roleLabel',
        'team',
        'statusLabel',
        'updatedAt',
    ],
};
