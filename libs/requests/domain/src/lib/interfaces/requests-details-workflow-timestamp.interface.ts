/** Étape barre workflow fiche demande (legacy `ManagementTimestamp`). */
export interface RequestsDetailsWorkflowTimestamp {
    readonly key: string;
    readonly labelKey: string;
    readonly timestamp: string | null;
}
