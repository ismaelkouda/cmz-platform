/** Routes Nx des cartes « statut tâche » — sémantique corrigée vs legacy (bug mapping). */
export const DASHBOARD_TASK_STATUS_ROUTES: Readonly<
    Record<string, readonly string[]>
> = {
    totalReportsPending: ['requests', 'queues'],
    totalReportsInProcessing: ['processing', 'queues'],
    totalReportsRejected: ['report-states', 'rejected'],
    totalReportsFinalized: ['finalization', 'queues'],
    totalReportsEvaluated: ['report-states', 'evaluated'],
};
