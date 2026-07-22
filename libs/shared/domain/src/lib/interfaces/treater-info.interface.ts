export interface TreaterInfo {
    readonly acknowledgedAt: string | null;
    readonly createdAt: string;
    readonly reportedAt: string;
    readonly processedAt: string | null;
    readonly approvedAt: string | null;
    readonly finalizedAt: string | null;
    readonly rejectedAt: string | null;
    readonly confirmedAt: string | null;
    readonly abandonedAt: string | null;
    readonly processedComment: string | null;
    readonly approvedComment: string | null;
    readonly rejectedComment: string | null;
    readonly acknowledgedComment: string | null;
    readonly confirmedComment: string | null;
    readonly abandonedComment: string | null;
    readonly denyCount: number;
    readonly reason: string | null;
    readonly callbackType: string | null;
}
