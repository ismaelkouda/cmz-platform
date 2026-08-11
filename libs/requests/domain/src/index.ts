// ADR-0020 (Option B, POC 2026-08-11) — la fonctionnalité "details" (99
// groupes quasi-identiques avec `report-states`, mémo
// `docs/architecture/factorisation-details-workflow.md`) est désormais
// portée par `@cmz/workflow-details-domain`, ré-exportée ici sous les noms
// historiques pour ne rien casser côté data/application/ui (aucun fichier
// hors domain n'a dû changer). Seul `RequestsDetailsRepository` reste un
// fichier local (token DI distinct, voir son commentaire).
//
// `isRequestsDetailsStatus` (type-guard) n'a PAS été repris : code mort
// confirmé (`grep -rn` sur `libs/`/`apps/` ne retournait que sa propre
// déclaration/export, jamais un appel réel) — même constat déjà documenté
// côté `report-states` pour `isReportStatesDetailsStatus`/
// `isReportStatesDetailsQualificationState` (T12-24/T12-21,
// `taches-restantes.md`). Ne pas le réintroduire dans la lib partagée pour
// ne pas y importer du code mort.
export {
    WorkflowDetailsTakeEntity as RequestsDetailsTakeEntity,
    WorkflowDetailsApproveEntity as RequestsDetailsApproveEntity,
    WorkflowDetailsRejectEntity as RequestsDetailsRejectEntity,
    WorkflowDetailsEntity as RequestsDetailsEntity,
    workflowDetailsFilterEntity as requestsDetailsFilterEntity,
    workflowDetailsQualificationVo as requestsDetailsQualificationVo,
    workflowDetailsFilterVo as requestsDetailsFilterVo,
    workflowDetailsTakeVo as requestsDetailsTakeVo,
    WorkflowDetailsStatus as RequestsDetailsStatus,
    WorkflowDetailsQualificationState as RequestsDetailsQualificationState,
    workflowDetailsWorkflowTimestamps as requestsDetailsWorkflowTimestamps,
} from '@cmz/workflow-details-domain';
export type {
    WorkflowDetailsFilterContract as RequestsDetailsFilterContract,
    WorkflowDetailsTakeContract as RequestsDetailsTakeContract,
    WorkflowDetailsQualificationContract as RequestsDetailsQualificationContract,
    WorkflowDetailsQualificationEditFields as RequestsDetailsQualificationEditFields,
    WorkflowDetailsPermissions as RequestsDetailsPermissions,
    WorkflowDetailsProps as RequestsDetailsProps,
    WorkflowDetailsWorkflowTimestamp as RequestsDetailsWorkflowTimestamp,
} from '@cmz/workflow-details-domain';
export { RequestsDetailsRepository } from './lib/repositories/requests-details.repository';
export {
    REQUESTS_ALL_ROUTE,
    REQUESTS_QUEUES_ROUTE,
    REQUESTS_TASKS_ROUTE,
} from './lib/constants/requests-rbac-paths.constant';
export { RequestsSection } from './lib/enums/requests-section.enum';
export {
    RequestsAllStatus,
    isRequestsAllStatus,
} from './lib/enums/requests-all-status.enum';
export { QueuesRequestsEntity } from './lib/entities/queues-requests.entity';
export { TasksRequestsEntity } from './lib/entities/tasks-requests.entity';
export { AllRequestsEntity } from './lib/entities/all-requests.entity';
export type { QueuesRequestsProps } from './lib/props/queues-requests.props';
export type { TasksRequestsProps } from './lib/props/tasks-requests.props';
export type { AllRequestsProps } from './lib/props/all-requests.props';
export type { QueuesRequestsFilterContract } from './lib/contracts/queues-requests-filter.contract';
export type { TasksRequestsFilterContract } from './lib/contracts/tasks-requests-filter.contract';
export type { AllRequestsFilterContract } from './lib/contracts/all-requests-filter.contract';
export { QueuesRequestsRepository } from './lib/repositories/queues-requests.repository';
export { TasksRequestsRepository } from './lib/repositories/tasks-requests.repository';
export { AllRequestsRepository } from './lib/repositories/all-requests.repository';
export { queuesRequestsFilterVo } from './lib/value-objects/queues-requests-filter.vo';
export { tasksRequestsFilterVo } from './lib/value-objects/tasks-requests-filter.vo';
export { allRequestsFilterVo } from './lib/value-objects/all-requests-filter.vo';
export { queuesRequestsFilterEntity } from './lib/entities/queues-requests-filter.entity';
export { tasksRequestsFilterEntity } from './lib/entities/tasks-requests-filter.entity';
export { allRequestsFilterEntity } from './lib/entities/all-requests-filter.entity';
