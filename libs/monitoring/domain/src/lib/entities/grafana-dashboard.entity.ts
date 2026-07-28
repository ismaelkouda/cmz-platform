/**
 * Les 4 entités du source (`NodeEntity`/`ServicesEntity`/`ResourcesEntity`/
 * `JobsEntity`) étaient des classes strictement identiques : un seul champ
 * `grafanaLink: string`, dupliqué 4 fois sans aucune variation. Consolidées
 * ici en une seule entité, réutilisée par les 4 façades (`stream()` la
 * paramètre par `MonitoringSection`).
 */
export class GrafanaDashboardEntity {
    constructor(public readonly grafanaLink: string) {}
}
