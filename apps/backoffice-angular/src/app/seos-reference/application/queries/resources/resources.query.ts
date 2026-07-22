export class ResourcesQuery {
    constructor(
        public readonly search?: string,
        public readonly startDate?: Date,
        public readonly endDate?: Date
    ) {}
}
