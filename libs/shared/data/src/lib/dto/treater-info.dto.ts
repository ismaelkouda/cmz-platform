export interface TreaterInfoDto {
    acknowledged_at: string | null;
    created_at: string;
    reported_at: string;
    processed_at: string | null;
    approved_at: string | null;
    finalized_at: string | null;
    rejected_at: string | null;
    confirmed_at: string | null;
    abandoned_at: string | null;
    processed_comment: string | null;
    approved_comment: string | null;
    rejected_comment: string | null;
    acknowledged_comment: string | null;
    confirmed_comment: string | null;
    abandoned_comment: string | null;
    deny_count: number;
    reason: string | null;
    callback_type: string | null;
}
