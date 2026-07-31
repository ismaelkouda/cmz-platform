/** Conformité action de traitement — valeurs = clés i18n (legacy `Conformity`). */
export const TasksActionsProcessingConformity = {
    CONFORM: 'COMMON.CONFORM',
    NON_CONFORM: 'COMMON.NON_CONFORM',
    IN_PROGRESS: 'COMMON.IN_PROGRESS',
    UNKNOWN: 'COMMON.UNKNOWN',
} as const;

export type TasksActionsProcessingConformity =
    (typeof TasksActionsProcessingConformity)[keyof typeof TasksActionsProcessingConformity];

export const TasksActionsProcessingConformityStyle = {
    CONFORM: 'success',
    NON_CONFORM: 'danger',
    IN_PROGRESS: 'warning',
    UNKNOWN: 'secondary',
} as const;

export type TasksActionsProcessingConformityStyle =
    (typeof TasksActionsProcessingConformityStyle)[keyof typeof TasksActionsProcessingConformityStyle];
