import { AllProcessingProps } from '../props/all-processing.props';

/** Entité liste — volet « Tous les traitements » (`AllEntity` legacy). */
export class AllProcessingEntity {
    constructor(private readonly props: AllProcessingProps) {}

    get type(): AllProcessingProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): AllProcessingProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): AllProcessingProps['operators'] {
        return this.props.operators;
    }

    get source(): AllProcessingProps['source'] {
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

    with(props: AllProcessingProps): AllProcessingEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new AllProcessingEntity(props);
    }
}
