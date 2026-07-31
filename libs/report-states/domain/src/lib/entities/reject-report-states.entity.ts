import { RejectReportStatesProps } from '../props/reject-report-states.props';

/** Entité liste — volet « Files d'attente » (`QueuesEntity` legacy). */
export class RejectReportStatesEntity {
    constructor(private readonly props: RejectReportStatesProps) {}

    get type(): RejectReportStatesProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): RejectReportStatesProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): RejectReportStatesProps['operators'] {
        return this.props.operators;
    }

    get source(): RejectReportStatesProps['source'] {
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

    with(props: RejectReportStatesProps): RejectReportStatesEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new RejectReportStatesEntity(props);
    }
}
