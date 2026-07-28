export class ReportStateItemEntity {
    constructor(
        public readonly id: string,
        public readonly uniqId: string,
        public readonly reportType: string,
        public readonly operator: string,
        public readonly source: string,
        public readonly createdAt: string,
        public readonly status: string
    ) {}
}
