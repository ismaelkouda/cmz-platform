/** Étape barre workflow fiche demande (legacy `ManagementTimestamp`). */
export interface FinalizationDetailsWorkflowTimestamp {
    readonly key: string;
    readonly labelKey: string;
    readonly timestamp: string | null;
}
