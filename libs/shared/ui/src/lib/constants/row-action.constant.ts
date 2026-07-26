/**
 * Codes d'action de menu de ligne — présentation pure (pas de domaine).
 * Valeurs stables pour id d'item ; libellés i18n via ROW_ACTION_LABEL.
 */
export const RowAction = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PUBLISH: 'published',
    UNPUBLISH: 'unpublished',
    AFFECTED: 'affected',
    DELETE: 'delete',
    EDIT: 'edit',
    ENABLE: 'enable',
    DISABLE: 'disable',
} as const;

export type RowAction = (typeof RowAction)[keyof typeof RowAction];

export const ROW_ACTION_LABEL: Record<RowAction, string> = {
    [RowAction.ACTIVE]: 'COMMON.ACTIVE',
    [RowAction.INACTIVE]: 'COMMON.INACTIVE',
    [RowAction.PUBLISH]: 'COMMON.PUBLISH',
    [RowAction.UNPUBLISH]: 'COMMON.UNPUBLISH',
    [RowAction.AFFECTED]: 'COMMON.AFFECTED',
    [RowAction.DELETE]: 'COMMON.DELETE',
    [RowAction.EDIT]: 'COMMON.EDIT',
    [RowAction.ENABLE]: 'COMMON.ENABLE',
    [RowAction.DISABLE]: 'COMMON.DISABLE',
};
