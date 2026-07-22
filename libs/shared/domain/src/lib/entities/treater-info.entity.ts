interface TreaterInfo {
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

export class TreaterInfoEntity implements TreaterInfo {
    constructor(
        public readonly acknowledgedAt: string | null,
        public readonly createdAt: string,
        public readonly reportedAt: string,
        public readonly processedAt: string | null,
        public readonly approvedAt: string | null,
        public readonly finalizedAt: string | null,
        public readonly rejectedAt: string | null,
        public readonly confirmedAt: string | null,
        public readonly abandonedAt: string | null,
        public readonly processedComment: string | null,
        public readonly approvedComment: string | null,
        public readonly rejectedComment: string | null,
        public readonly acknowledgedComment: string | null,
        public readonly confirmedComment: string | null,
        public readonly abandonedComment: string | null,
        public readonly denyCount: number,
        public readonly reason: string | null,
        public readonly callbackType: string | null
    ) {}
}
