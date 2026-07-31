import { ApproveReportStatesProps } from '../props/approve-report-states.props';

/** Entité liste — volet « Files d'attente » (`QueuesEntity` legacy). */
export class ApproveReportStatesEntity {
    constructor(private readonly props: ApproveReportStatesProps) {}

    get type(): ApproveReportStatesProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): ApproveReportStatesProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): ApproveReportStatesProps['operators'] {
        return this.props.operators;
    }

    get source(): ApproveReportStatesProps['source'] {
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

    with(props: ApproveReportStatesProps): ApproveReportStatesEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ApproveReportStatesEntity(props);
    }
}
