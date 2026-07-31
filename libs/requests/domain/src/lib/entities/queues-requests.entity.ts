import { QueuesRequestsProps } from '../props/queues-requests.props';

/** Entité liste — volet « Files d'attente » (`QueuesEntity` legacy). */
export class QueuesRequestsEntity {
    constructor(private readonly props: QueuesRequestsProps) {}

    get type(): QueuesRequestsProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): QueuesRequestsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): QueuesRequestsProps['operators'] {
        return this.props.operators;
    }

    get source(): QueuesRequestsProps['source'] {
        return this.props.source;
    }

    get initiatorPhoneNumber(): string {
        return this.props.initiatorPhoneNumber;
    }

    get reportedAt(): string {
        return this.props.reportedAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: QueuesRequestsProps): QueuesRequestsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new QueuesRequestsEntity(props);
    }
}
