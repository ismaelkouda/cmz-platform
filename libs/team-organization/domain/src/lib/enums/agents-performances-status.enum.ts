/**
 * Statut d'un agent au regard de ses objectifs (`Status` legacy — atteint /
 * non atteint). Même convention que `ParticipantsStatus`/`TeamsStatus`
 * (chacun le sien, valeurs wire-safe en minuscules, garde de type
 * `isXStatus` plutôt qu'un mapping enum-vers-enum séparé — voir
 * `agents-performances.mapper.ts`, qui suit exactement le même schéma que
 * `ParticipantsMapper` : valider via la garde puis assigner `dto.status`
 * tel quel, pas de `Record<StatusDto, Status>` intermédiaire).
 */
export const AgentsPerformancesStatus = {
    COMPLETED: 'completed',
    NOT_COMPLETED: 'not_completed',
} as const;

export type AgentsPerformancesStatus =
    (typeof AgentsPerformancesStatus)[keyof typeof AgentsPerformancesStatus];

const AGENTS_PERFORMANCES_STATUS_VALUES = new Set<string>(
    Object.values(AgentsPerformancesStatus)
);

export function isAgentsPerformancesStatus(
    value: unknown
): value is AgentsPerformancesStatus {
    return (
        typeof value === 'string' &&
        AGENTS_PERFORMANCES_STATUS_VALUES.has(value)
    );
}
