/** Champs modifiables — requis si `approvalType` est `edit` ou `callback`. */
export interface WorkflowDetailsQualificationEditFields {
    latitude: number;
    longitude: number;
    locationName: string;
    reportType: string;
    operators: string[];
    description: string;
    placeDescription: string;
    placePhoto: string | File | null;
}

/** Formulaire qualification — tranche B+ (legacy `ManagementFormStore`). */
export interface WorkflowDetailsQualificationContract {
    decision: 'accepted' | 'rejected';
    comment: string;
    reason: string;
    approvalType: string;
    callbackType: string | null;
    editFields?: WorkflowDetailsQualificationEditFields;
}
