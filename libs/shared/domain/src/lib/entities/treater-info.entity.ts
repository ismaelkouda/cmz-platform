import { TreaterInfo } from '../interfaces/treater-info.interface';

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
