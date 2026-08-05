import { DailyGoalStatus } from '../enums/daily-goal-status.enum';

/**
 * Forme métier d'un item liste `daily-goal` (`DailyGoalProps` legacy).
 * Champs `firstName`/`lastName` à plat — même convention que
 * `ParticipantsProps`/`AgentsPerformancesProps` (aucun module de
 * `team-organization` n'utilise `ActorEntity`/`ActorDto`, réservés aux
 * modules `workflow-action` pour leurs champs `initiator`/
 * `acknowledgedBy` etc. ; `daily-goal` appartient à `team-organization`,
 * dont le seul précédent pour une « personne » est `participants`
 * lui-même).
 */
export interface DailyGoalProps {
    readonly uniqId: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly goalsSize: string;
    readonly achievementsSize: string;
    readonly percentages: string;
    readonly status: DailyGoalStatus;
    readonly createdAt: string;
}
