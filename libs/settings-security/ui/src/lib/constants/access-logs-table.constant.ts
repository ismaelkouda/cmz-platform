import { TableColumn } from '@cmz/shared-ui';

/** Pas de colonne `__actionDropdown` : lecture seule, aucune action de ligne. */
export const ACCESS_LOGS_TABLE: {
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
            field: 'actionLabel',
            header: 'SETTINGS_SECURITY.ACCESS_LOGS.TABLE.ACTION',
            width: '10rem',
        },
        {
            field: 'source',
            header: 'SETTINGS_SECURITY.ACCESS_LOGS.TABLE.SOURCE',
            width: '10rem',
        },
        {
            field: 'userAgent',
            header: 'SETTINGS_SECURITY.ACCESS_LOGS.TABLE.USER_AGENT',
            width: '16rem',
        },
        {
            field: 'createdAt',
            header: 'SETTINGS_SECURITY.ACCESS_LOGS.TABLE.CREATED_AT',
            class: 'text-center',
            width: '8rem',
        },
    ],
    globalFilterFields: ['actionLabel', 'source', 'userAgent', 'createdAt'],
};
