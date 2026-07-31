import { QueuesProcessingProps } from '../props/queues-processing.props';

/** Entité liste — volet « Files d'attente » (`QueuesEntity` legacy). */
export class QueuesProcessingEntity {
    constructor(private readonly props: QueuesProcessingProps) {}

    get type(): QueuesProcessingProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): QueuesProcessingProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): QueuesProcessingProps['operators'] {
        return this.props.operators;
    }

    get source(): QueuesProcessingProps['source'] {
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

    with(props: QueuesProcessingProps): QueuesProcessingEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new QueuesProcessingEntity(props);
    }
}
