/**
 * Style d'affichage actif / inactif — concern UI transverse (clés i18n
 * `COMMON.*`). Factorisé depuis les copies byte-identiques admin-infra /
 * coverage-areas (audit F-7 / P1-11).
 *
 * Les enums UI à membres étendus (`UsersStatusStyle`, `NewsStatusStyle`…)
 * restent locaux à leur module : seul le binaire ACTIVE/INACTIVE est partagé.
 */
export enum StatusStyle {
    ACTIVE = 'COMMON.ACTIVE_STYLE',
    INACTIVE = 'COMMON.INACTIVE_STYLE',
}
