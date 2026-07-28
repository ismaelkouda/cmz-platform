import { AccessLogsProps } from '../props/access-logs.props';

export class AccessLogsEntity {
    constructor(private readonly props: AccessLogsProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get action(): AccessLogsProps['action'] {
        return this.props.action;
    }

    get source(): string {
        return this.props.source;
    }

    get userAgent(): string {
        return this.props.userAgent;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    /** Pas de `updatedAt` (entrées immuables) — cache comparé sur `uniqId` seul. */
    with(props: AccessLogsProps): AccessLogsEntity {
        if (this.uniqId === props.uniqId) {
            return this;
        }
        return new AccessLogsEntity(props);
    }
}
