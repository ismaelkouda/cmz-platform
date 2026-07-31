import { AllRequestsProps } from '../props/all-requests.props';

/** Entité liste — volet « Demandes qualifiées » (`AllEntity` legacy). */
export class AllRequestsEntity {
    constructor(private readonly props: AllRequestsProps) {}

    get type(): AllRequestsProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): AllRequestsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): AllRequestsProps['operators'] {
        return this.props.operators;
    }

    get source(): AllRequestsProps['source'] {
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

    with(props: AllRequestsProps): AllRequestsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new AllRequestsEntity(props);
    }
}
