import { TableColumn } from '@cmz/shared-ui';

export const MUNICIPALITIES_BY_DEPARTMENT_ID_TABLE: {
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
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITIES_BY_DEPARTMENT_ID.TABLE.CODE',
            width: '6rem',
        },
        {
            field: 'name',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITIES_BY_DEPARTMENT_ID.TABLE.NAME',
            width: '17rem',
        },
        {
            field: 'populationSize',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITIES_BY_DEPARTMENT_ID.TABLE.POPULATION_SIZE',
            class: 'text-center',
            width: '4rem',
        },
        {
            field: 'statusLabel',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITIES_BY_DEPARTMENT_ID.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'createdAt',
            header: 'ADMINISTRATIVE_BOUNDARY.MUNICIPALITIES_BY_DEPARTMENT_ID.TABLE.CREATED_AT',
            class: 'text-center',
            width: '5rem',
        },
    ],
    globalFilterFields: ['code', 'name', 'statusLabel'],
};
