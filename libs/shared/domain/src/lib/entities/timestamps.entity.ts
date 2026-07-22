import { Timestamps } from '../interfaces/timestamps.interface';

export class TimestampsEntity implements Timestamps {
    constructor(
        public readonly createdAt: string,
        public readonly updatedAt: string
    ) {}
}
