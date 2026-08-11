// ADR-0020 (Option B, POC 2026-08-11) — la fonctionnalité "details" (99
// groupes quasi-identiques avec `requests`, mémo
// `docs/architecture/factorisation-details-workflow.md`) est désormais
// portée par `@cmz/workflow-details-domain`, ré-exportée ici sous les noms
// historiques pour ne rien casser côté data/application/ui (aucun fichier
// hors domain n'a dû changer). Seul `ReportStatesDetailsRepository` reste un
// fichier local (token DI distinct, voir son commentaire).
export {
    WorkflowDetailsTakeEntity as ReportStatesDetailsTakeEntity,
    WorkflowDetailsApproveEntity as ReportStatesDetailsApproveEntity,
    WorkflowDetailsRejectEntity as ReportStatesDetailsRejectEntity,
    WorkflowDetailsEntity as ReportStatesDetailsEntity,
    workflowDetailsFilterEntity as reportStatesDetailsFilterEntity,
    workflowDetailsQualificationVo as reportStatesDetailsQualificationVo,
    workflowDetailsFilterVo as reportStatesDetailsFilterVo,
    workflowDetailsTakeVo as reportStatesDetailsTakeVo,
    WorkflowDetailsStatus as ReportStatesDetailsStatus,
    WorkflowDetailsQualificationState as ReportStatesDetailsQualificationState,
    workflowDetailsWorkflowTimestamps as reportStatesDetailsWorkflowTimestamps,
} from '@cmz/workflow-details-domain';
export type {
    WorkflowDetailsFilterContract as ReportStatesDetailsFilterContract,
    WorkflowDetailsTakeContract as ReportStatesDetailsTakeContract,
    WorkflowDetailsQualificationContract as ReportStatesDetailsQualificationContract,
    WorkflowDetailsQualificationEditFields as ReportStatesDetailsQualificationEditFields,
    WorkflowDetailsPermissions as ReportStatesDetailsPermissions,
    WorkflowDetailsProps as ReportStatesDetailsProps,
    WorkflowDetailsWorkflowTimestamp as ReportStatesDetailsWorkflowTimestamp,
} from '@cmz/workflow-details-domain';
export { ReportStatesDetailsRepository } from './lib/repositories/report-states-details.repository';
export { REPORT_STATES_DETAILS_MODULE_PREFIX } from './lib/constants/report-states-details-module-prefix.constant';
export {
    REPORT_STATES_APPROVE_ROUTE,
    REPORT_STATES_EVALUATE_ROUTE,
    REPORT_STATES_CLOSE_ROUTE,
    REPORT_STATES_REJECT_ROUTE,
    REPORT_STATES_DOWNLOAD_ROUTE,
} from './lib/constants/report-states-rbac-paths.constant';
export { ReportStateSection } from './lib/enums/report-state-section.enum';
export { ApproveReportStatesEntity } from './lib/entities/approve-report-states.entity';
export { EvaluateReportStatesEntity } from './lib/entities/evaluate-report-states.entity';
export { CloseReportStatesEntity } from './lib/entities/close-report-states.entity';
export { RejectReportStatesEntity } from './lib/entities/reject-report-states.entity';
export { DownloadReportStatesEntity } from './lib/entities/download-report-states.entity';
export {
    DownloadReportStatesStatus,
    downloadReportStatesStatusStyle,
    DownloadReportStatesStatusStyle,
} from './lib/enums/download-report-states-status.enum';
export {
    DownloadReportStatesType,
    DownloadReportStatesTypeStyle,
} from './lib/enums/download-report-states-type.enum';
export type { ApproveReportStatesProps } from './lib/props/approve-report-states.props';
export type { EvaluateReportStatesProps } from './lib/props/evaluate-report-states.props';
export type { CloseReportStatesProps } from './lib/props/close-report-states.props';
export type { RejectReportStatesProps } from './lib/props/reject-report-states.props';
export type { DownloadReportStatesProps } from './lib/props/download-report-states.props';
export type { ApproveReportStatesFilterContract } from './lib/contracts/approve-report-states-filter.contract';
export type { EvaluateReportStatesFilterContract } from './lib/contracts/evaluate-report-states-filter.contract';
export type { CloseReportStatesFilterContract } from './lib/contracts/close-report-states-filter.contract';
export type { RejectReportStatesFilterContract } from './lib/contracts/reject-report-states-filter.contract';
export type { DownloadReportStatesFilterContract } from './lib/contracts/download-report-states-filter.contract';
export { ApproveReportStatesRepository } from './lib/repositories/approve-report-states.repository';
export { EvaluateReportStatesRepository } from './lib/repositories/evaluate-report-states.repository';
export { CloseReportStatesRepository } from './lib/repositories/close-report-states.repository';
export { RejectReportStatesRepository } from './lib/repositories/reject-report-states.repository';
export { DownloadReportStatesRepository } from './lib/repositories/download-report-states.repository';
export { approveReportStatesFilterVo } from './lib/value-objects/approve-report-states-filter.vo';
export { evaluateReportStatesFilterVo } from './lib/value-objects/evaluate-report-states-filter.vo';
export { closeReportStatesFilterVo } from './lib/value-objects/close-report-states-filter.vo';
export { rejectReportStatesFilterVo } from './lib/value-objects/reject-report-states-filter.vo';
export { downloadReportStatesFilterVo } from './lib/value-objects/download-report-states-filter.vo';
export { approveReportStatesFilterEntity } from './lib/entities/approve-report-states-filter.entity';
export { evaluateReportStatesFilterEntity } from './lib/entities/evaluate-report-states-filter.entity';
export { closeReportStatesFilterEntity } from './lib/entities/close-report-states-filter.entity';
export { rejectReportStatesFilterEntity } from './lib/entities/reject-report-states-filter.entity';
export { downloadReportStatesFilterEntity } from './lib/entities/download-report-states-filter.entity';
