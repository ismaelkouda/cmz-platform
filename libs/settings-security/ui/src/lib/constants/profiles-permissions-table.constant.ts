import { TableColumn } from '@cmz/shared-ui';

export const PROFILES_PERMISSIONS_TABLE: {
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
            field: 'name',
            header: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.TABLE.NAME',
            width: '10rem',
        },
        {
            field: 'description',
            header: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.TABLE.DESCRIPTION',
            width: '18rem',
        },
        {
            field: 'usersCount',
            header: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.TABLE.USERS_COUNT',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'statusLabel',
            header: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'name',
        'description',
        'usersCount',
        'statusLabel',
        'updatedAt',
    ],
};
