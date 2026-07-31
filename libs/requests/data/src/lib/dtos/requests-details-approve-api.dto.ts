export interface RequestsDetailsApproveApiDto {
    uniq_id: string;
    comment: string;
    approval_type: string;
    callback_type: string | null;
    lat: string;
    long: string;
    location_name: string;
    report_type: string;
    operators: string[];
    description: string;
    decision: string;
    place_description: string;
    reason: string | null;
    place_photo: string | File | null;
}
