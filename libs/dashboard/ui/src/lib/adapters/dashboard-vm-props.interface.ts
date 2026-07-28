export type StatCardColor =
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info';

export interface StatCardVm {
    readonly key: string;
    readonly value: string;
    readonly label: string;
    readonly icon: string;
    readonly color: StatCardColor;
}

/**
 * `performanceCards` : le source calculait ces 4 cartes
 * (`performanceStatistics`) mais ne les rendait JAMAIS dans le template
 * (`dashboard-page.component.html` n'affiche que `typeStatistics`/
 * `taskStatusStatistics`) — une section quasi terminée, oubliée à
 * l'intégration plutôt qu'une fonctionnalité désactivée volontairement.
 * Complétée ici plutôt que reproduite à l'identique (données correctes,
 * juste jamais branchées).
 */
export interface DashboardVm {
    readonly lastRefreshAt: string;
    readonly typeCards: StatCardVm[];
    readonly taskStatusCards: StatCardVm[];
    readonly performanceCards: StatCardVm[];
}
