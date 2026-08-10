/**
 * Lien Grafana embarqué — classe unique remplaçant 3 duplicatas triviaux
 * strictement identiques (`{ grafanaLink: string }`, même constructeur) :
 * `GrafanaDashboardEntity` dans `monitoring` et `reporting`, `MapEntity`
 * dans `interactive-map` (P2-4, `docs/architecture/backlog-llm.md`).
 * Consolidée ici plutôt que dans chaque module, conformément à la règle
 * « tout couplage transverse passe par `@cmz/shared-*` » (`LLM_CONTEXT.md`
 * §2).
 */
export class GrafanaLinkEntity {
    constructor(public readonly grafanaLink: string) {}
}
