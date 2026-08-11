import { WorkflowDetailsRepositoryBase } from '@cmz/workflow-details-domain';

/**
 * Port module `requests` — logique 100 % partagée avec `report-states` via
 * `WorkflowDetailsRepositoryBase` (ADR-0020 Option B, POC 2026-08-11).
 * Reste une classe distincte (pas un alias direct de la base) pour garder un
 * token Angular DI distinct de `ReportStatesDetailsRepository` — deux
 * `provide: WorkflowDetailsRepositoryBase` dans le même injecteur racine
 * s'écraseraient silencieusement l'un l'autre (memo
 * `factorisation-details-workflow.md` §3.3).
 */
export abstract class RequestsDetailsRepository extends WorkflowDetailsRepositoryBase {}
