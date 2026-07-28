import { ReportType } from '@cmz/shared-domain';

/**
 * Champs volontairement omis par rapport au `DashboardProps` source —
 * confirmés 100% morts par grep sur tout le repo source (jamais lus par
 * `DashboardPageComponent`, ni dans les cartes réellement rendues, ni même
 * dans `performanceStatistics`, calculé mais jamais affiché dans le
 * template) : `partialOperatorReports`/`whiteZoneReports`/
 * `partialSignalReports`/`noInternetReports` en champs top-level séparés
 * (remplacés par `reportsByType`, cf. ci-dessous), `pendingReports`/
 * `approvedReports`/`rejectedReports`/`inTreatmentReports`/
 * `closedReports`/`totalActive` (getter dérivé), `approvalRate`.
 *
 * `totalReports` : `number`, pas `string` — le mapper source applique
 * `separatorThousands` (formatage de présentation) directement dans la
 * couche data, un concern qui n'a rien à faire hors de l'UI. Corrigé :
 * la valeur reste numérique jusqu'à l'UI, qui applique
 * `ThousandsSeparatorPipe` (kernel `@cmz/shared-ui`, jamais consommé
 * jusqu'ici).
 */
export interface DashboardProps {
    totalReports: number;
    /**
     * Répartition par type de signalement (kernel `ReportType`, déjà
     * consommé ailleurs — ABI/ZOB/CPS/CPO). Remplace 4 champs séparés du
     * source (`total_cpo_reports`/`total_zob_reports`/`total_cps_reports`/
     * `total_abi_reports`) dont les noms domaine (`partialOperatorReports`
     * etc.) ne faisaient que paraphraser l'acronyme sans ajouter de
     * signification supplémentaire — un `Record<ReportType, number>`
     * réutilise un concept déjà établi plutôt que d'en réinventer un.
     */
    reportsByType: Record<ReportType, number>;
    totalReportsPending: number;
    totalReportsInProcessing: number;
    /**
     * **Renommé** depuis `totalReportsProcessed` (source). Le mapper
     * source alimentait ce champ avec `dto.total_reports_in_processing`
     * (déjà utilisé — à tort — pour `totalReportsInProcessing`, alimenté
     * lui-même par `dto.total_request_report_rejected`) : un décalage
     * d'un cran entre 3 champs wire et 2 champs domaine. Il n'existe AUCUN
     * champ wire nommé "processed" — le seul champ wire restant après
     * correction du décalage est `total_request_report_rejected`, qui
     * désigne des signalements REJETÉS, pas "traités". Corrigé : le champ
     * domaine est renommé pour refléter ce que le wire fournit réellement
     * plutôt que de conserver un nom qui ne correspondait à aucune donnée
     * cohérente.
     */
    totalReportsRejected: number;
    totalReportsFinalized: number;
    totalReportsEvaluated: number;
    treatmentRate: number;
    completionRate: number;
    averageTreatmentTime: number;
    responseTime: number;
    lastRefreshAt: string;
}
