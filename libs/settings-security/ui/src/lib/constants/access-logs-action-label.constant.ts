import { AccessLogsAction } from '@cmz/settings-security-domain';

/** Clés i18n des libellés d'action du journal — présentation pure. */
export const ACCESS_LOGS_ACTION_LABEL: Record<AccessLogsAction, string> = {
    [AccessLogsAction.LOGIN]: 'SETTINGS_SECURITY.ACCESS_LOGS.ACTION.LOGIN',
    [AccessLogsAction.LOGOUT]: 'SETTINGS_SECURITY.ACCESS_LOGS.ACTION.LOGOUT',
    [AccessLogsAction.ATTEMPTED_LOGIN]:
        'SETTINGS_SECURITY.ACCESS_LOGS.ACTION.ATTEMPTED_LOGIN',
    [AccessLogsAction.BLOCKED_ATTEMPTED_LOGIN]:
        'SETTINGS_SECURITY.ACCESS_LOGS.ACTION.BLOCKED_ATTEMPTED_LOGIN',
    [AccessLogsAction.ATTEMPTS_EXCEEDED]:
        'SETTINGS_SECURITY.ACCESS_LOGS.ACTION.ATTEMPTS_EXCEEDED',
};
