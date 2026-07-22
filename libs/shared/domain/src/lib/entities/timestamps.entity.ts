interface Timestamps {
    readonly createdAt: string;
    readonly updatedAt: string;
}

export class TimestampsEntity implements Timestamps {
    constructor(
        public readonly createdAt: string,
        public readonly updatedAt: string
    ) {}
}
