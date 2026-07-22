import { TimestampsProps } from '../props/timestamps.props';

export class TimestampsEntity implements TimestampsProps {
    constructor(
        public readonly createdAt: string,
        public readonly updatedAt: string
    ) {}
}
