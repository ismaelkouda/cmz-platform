import { EvaluateReportStatesProps } from '../props/evaluate-report-states.props';

/** Entité liste — volet « Tâches » (`TasksEntity` legacy). */
export class EvaluateReportStatesEntity {
    constructor(private readonly props: EvaluateReportStatesProps) {}

    get type(): EvaluateReportStatesProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): EvaluateReportStatesProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): EvaluateReportStatesProps['operators'] {
        return this.props.operators;
    }

    get source(): EvaluateReportStatesProps['source'] {
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

    with(props: EvaluateReportStatesProps): EvaluateReportStatesEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new EvaluateReportStatesEntity(props);
    }
}
