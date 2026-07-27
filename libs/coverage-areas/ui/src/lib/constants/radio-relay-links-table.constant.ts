import { TableColumn } from '@cmz/shared-ui';

export const RADIO_RELAY_LINKS_TABLE: {
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
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.NAME',
            width: '10rem',
        },
        {
            field: 'operator',
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.OPERATOR',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'frequency',
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.FREQUENCY',
            class: 'text-center',
            width: '6rem',
        },
        {
            field: 'startDate',
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.START_DATE',
            class: 'text-center',
            width: '7rem',
        },
        {
            field: 'endDate',
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.END_DATE',
            class: 'text-center',
            width: '7rem',
        },
        {
            field: 'statusLabel',
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'updatedAt',
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.UPDATED_AT',
            class: 'text-center',
            width: '8rem',
        },
        {
            field: '__actionDropdown',
            header: 'COVERAGE_AREAS.RADIO_RELAY_LINKS.TABLE.ACTION',
            class: 'text-center',
            width: '4rem',
        },
    ],
    globalFilterFields: [
        'name',
        'operator',
        'frequency',
        'statusLabel',
        'updatedAt',
    ],
};
