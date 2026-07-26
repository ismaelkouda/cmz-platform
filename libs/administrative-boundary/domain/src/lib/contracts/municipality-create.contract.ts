/**
 * Champs renommés vs source (`population`→`populationSize`,
 * `infrastructure`→`infrastructureCount`, `region`/`department`→
 * `regionId`/`departmentId`) pour rester cohérent avec `department` (même
 * incohérence de nommage déjà corrigée à ce niveau).
 */
export interface MunicipalityCreateContract {
    code?: string;
    name?: string;
    description?: string;
    populationSize?: number;
    infrastructureCount?: number;
    regionId?: string;
    departmentId?: string;
}
