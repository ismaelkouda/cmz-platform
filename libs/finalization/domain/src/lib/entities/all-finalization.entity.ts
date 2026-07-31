import { AllFinalizationProps } from '../props/all-finalization.props';

/** Entité liste — volet « Demandes qualifiées » (`AllEntity` legacy). */
export class AllFinalizationEntity {
    constructor(private readonly props: AllFinalizationProps) {}

    get type(): AllFinalizationProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): AllFinalizationProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): AllFinalizationProps['operators'] {
        return this.props.operators;
    }

    get source(): AllFinalizationProps['source'] {
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

    with(props: AllFinalizationProps): AllFinalizationEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new AllFinalizationEntity(props);
    }
}
