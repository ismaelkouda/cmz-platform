import { DashboardProps } from '../interfaces/dashboard-props.interface';

export class DashboardEntity {
    constructor(private readonly props: DashboardProps) {}

    get totalReports(): number {
        return this.props.totalReports;
    }

    get reportsByType(): DashboardProps['reportsByType'] {
        return this.props.reportsByType;
    }

    get totalReportsPending(): number {
        return this.props.totalReportsPending;
    }

    get totalReportsInProcessing(): number {
        return this.props.totalReportsInProcessing;
    }

    get totalReportsRejected(): number {
        return this.props.totalReportsRejected;
    }

    get totalReportsFinalized(): number {
        return this.props.totalReportsFinalized;
    }

    get totalReportsEvaluated(): number {
        return this.props.totalReportsEvaluated;
    }

    get treatmentRate(): number {
        return this.props.treatmentRate;
    }

    get completionRate(): number {
        return this.props.completionRate;
    }

    get averageTreatmentTime(): number {
        return this.props.averageTreatmentTime;
    }

    get responseTime(): number {
        return this.props.responseTime;
    }

    get lastRefreshAt(): string {
        return this.props.lastRefreshAt;
    }

    public with(props: DashboardProps): DashboardEntity {
        if (this.lastRefreshAt === props.lastRefreshAt) {
            return this;
        }
        return new DashboardEntity(props);
    }
}
