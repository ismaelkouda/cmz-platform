import { TableColumn } from '@cmz/shared-ui';

/**
 * Pas d'`actions`/`TableRowActionDefinition` — contrairement à
 * `AGENTS_PERFORMANCES_TABLE`, `daily-goal` n'a aucun second chain
 * (find-one/history) à naviguer : le legacy redirige `history` vers le
 * composant générique partagé sans jamais le câbler à une action de
 * ligne réelle. Reproduit sans inventer une action sans destination.
 */
export const DAILY_GOAL_TABLE: {
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
            header: 'TEAM_ORGANIZATION.DAILY_GOAL.TABLE.FIRST_NAME',
            width: '9rem',
        },
        {
            field: 'lastName',
            header: 'TEAM_ORGANIZATION.DAILY_GOAL.TABLE.LAST_NAME',
            width: '9rem',
        },
        {
            field: 'goalsSize',
            header: 'TEAM_ORGANIZATION.DAILY_GOAL.TABLE.GOALS_SIZE',
            width: '10rem',
            type: 'number',
        },
        {
            field: 'achievementsSize',
            header: 'TEAM_ORGANIZATION.DAILY_GOAL.TABLE.ACHIEVEMENTS_SIZE',
            width: '10rem',
            type: 'number',
        },
        {
            field: 'percentages',
            header: 'TEAM_ORGANIZATION.DAILY_GOAL.TABLE.PERCENTAGES',
            width: '10rem',
        },
        {
            field: 'statusLabel',
            header: 'TEAM_ORGANIZATION.DAILY_GOAL.TABLE.STATUS',
            class: 'text-center',
            width: '5rem',
        },
        {
            field: 'createdAt',
            header: 'TEAM_ORGANIZATION.DAILY_GOAL.TABLE.CREATED_AT',
            class: 'text-center',
            width: '9rem',
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
