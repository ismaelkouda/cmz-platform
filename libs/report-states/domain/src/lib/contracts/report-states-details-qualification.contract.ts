/** Champs modifiables — requis si `approvalType` est `edit` ou `callback`. */
export interface ReportStatesDetailsQualificationEditFields {
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
export interface ReportStatesDetailsQualificationContract {
    decision: 'accepted' | 'rejected';
    comment: string;
    reason: string;
    approvalType: string;
    callbackType: string | null;
    editFields?: ReportStatesDetailsQualificationEditFields;
}
