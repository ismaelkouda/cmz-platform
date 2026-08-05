/**
 * Filtre de liste `agents-performances`. `isAchieved` est une chaîne libre
 * côté legacy (pas un booléen ni un enum), reproduit à l'identique — c'est
 * le wire réel (`AgentsPerformancesFilterDto.isAchieved?: string`), pas une
 * simplification.
 */
export interface AgentsPerformancesFilterContract {
    search?: string;
    member?: string;
    isAchieved?: string;
    startDate?: Date;
    endDate?: Date;
}
