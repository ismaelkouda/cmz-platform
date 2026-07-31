import { CloseReportStatesProps } from '../props/close-report-states.props';

/** Entité liste — volet « Demandes qualifiées » (`AllEntity` legacy). */
export class CloseReportStatesEntity {
    constructor(private readonly props: CloseReportStatesProps) {}

    get type(): CloseReportStatesProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): CloseReportStatesProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): CloseReportStatesProps['operators'] {
        return this.props.operators;
    }

    get source(): CloseReportStatesProps['source'] {
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

    with(props: CloseReportStatesProps): CloseReportStatesEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new CloseReportStatesEntity(props);
    }
}
