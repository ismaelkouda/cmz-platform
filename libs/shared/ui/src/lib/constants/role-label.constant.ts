import { Role } from '@cmz/shared-domain';

/** Clés i18n des libellés rôle — présentation pure. */
export const ROLE_LABEL: Record<Role, string> = {
    [Role.SUPERVISOR]: 'COMMON.SUPERVISOR',
    [Role.LEADER]: 'COMMON.LEADER',
    [Role.AGENT]: 'COMMON.AGENT',
};

/** Clés i18n des tokens de style badge — hors domaine. */
export const ROLE_STYLE: Record<Role, string> = {
    [Role.SUPERVISOR]: 'COMMON.SUPERVISOR_STYLE',
    [Role.LEADER]: 'COMMON.LEADER_STYLE',
    [Role.AGENT]: 'COMMON.AGENT_STYLE',
};

/** Options filtre / select. */
export const ROLE_OPTIONS = (Object.values(Role) as Role[]).map((value) => ({
    value,
    label: ROLE_LABEL[value],
}));
