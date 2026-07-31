/** Conformité action de traitement — valeurs = clés i18n (legacy `Conformity`). */
export const TasksActionsConformity = {
    CONFORM: 'COMMON.CONFORM',
    NON_CONFORM: 'COMMON.NON_CONFORM',
    IN_PROGRESS: 'COMMON.IN_PROGRESS',
    UNKNOWN: 'COMMON.UNKNOWN',
} as const;

export type TasksActionsConformity =
    (typeof TasksActionsConformity)[keyof typeof TasksActionsConformity];

export const TasksActionsConformityStyle = {
    CONFORM: 'success',
    NON_CONFORM: 'danger',
    IN_PROGRESS: 'warning',
    UNKNOWN: 'secondary',
} as const;

export type TasksActionsConformityStyle =
    (typeof TasksActionsConformityStyle)[keyof typeof TasksActionsConformityStyle];
