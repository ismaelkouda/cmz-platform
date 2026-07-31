import { QueuesFinalizationProps } from '../props/queues-finalization.props';

/** Entité liste — volet « Files d'attente » (`QueuesEntity` legacy). */
export class QueuesFinalizationEntity {
    constructor(private readonly props: QueuesFinalizationProps) {}

    get type(): QueuesFinalizationProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): QueuesFinalizationProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): QueuesFinalizationProps['operators'] {
        return this.props.operators;
    }

    get source(): QueuesFinalizationProps['source'] {
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

    with(props: QueuesFinalizationProps): QueuesFinalizationEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new QueuesFinalizationEntity(props);
    }
}
