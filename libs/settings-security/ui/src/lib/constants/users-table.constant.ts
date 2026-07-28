import { TableColumn } from '@cmz/shared-ui';

export const USERS_TABLE: {
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
            header: 'SETTINGS_SECURITY.USERS.TABLE.FIRST_NAME',
            width: '7rem',
        },
        {
            field: 'lastName',
            header: 'SETTINGS_SECURITY.USERS.TABLE.LAST_NAME',
            width: '7rem',
        },
        {
            field: 'email',
            header: 'SETTINGS_SECURITY.USERS.TABLE.EMAIL',
            width: '12rem',
        },
        {
            field: 'phone',
            header: 'SETTINGS_SECURITY.USERS.TABLE.PHONE',
            width: '8rem',
        },
        {
            field: 'roleLabel',
            header: 'SETTINGS_SECURITY.USERS.TABLE.ROLE',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'profile',
            header: 'SETTINGS_SECURITY.USERS.TABLE.PROFILE',
            width: '8rem',
        },
        {
            field: 'statusLabel',
            header: 'SETTINGS_SECURITY.USERS.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'SETTINGS_SECURITY.USERS.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'SETTINGS_SECURITY.USERS.TABLE.ACTION',
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
        'profile',
        'statusLabel',
        'updatedAt',
    ],
};
