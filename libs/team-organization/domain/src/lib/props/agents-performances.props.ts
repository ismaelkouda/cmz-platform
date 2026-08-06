import { AgentsPerformancesStatus } from '../enums/agents-performances-status.enum';

/**
 * Forme métier d'un item liste `agents-performances`
 * (`AgentsPerformancesProps` legacy). Champs `firstName`/`lastName` à plat
 * — même convention que `ParticipantsProps` (aucun module de
 * `team-organization` n'utilise `ActorEntity`/`ActorDto`, réservés aux
 * modules `workflow-action` pour leurs champs `initiator`/`acknowledgedBy`
 * etc. ; `agents-performances` appartient à `team-organization`, dont le
 * seul précédent pour une « personne » est `participants` lui-même).
 */
export interface AgentsPerformancesProps {
    readonly uniqId: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly goalsSize: string;
    readonly achievementsSize: string;
    readonly percentages: string;
    readonly status: AgentsPerformancesStatus;
    readonly createdAt: string;
}
