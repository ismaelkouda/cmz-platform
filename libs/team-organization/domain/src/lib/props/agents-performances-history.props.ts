/**
 * Forme métier d'un item du volet « historique » d'un agent
 * (`AgentsPerformancesFindOneProps` legacy — nom trompeur : c'est en
 * réalité une 2e liste paginée filtrée par `uniqId`, pas un GET simple par
 * id, confirmé par le wire `Paginate<...>` et le repository legacy
 * `execute(filter, page, options)`).
 */
export interface AgentsPerformancesHistoryProps {
    readonly uniqId: string;
    readonly reportType: string;
    readonly operators: string;
    readonly source: string;
    readonly initiatorPhoneNumber: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}
