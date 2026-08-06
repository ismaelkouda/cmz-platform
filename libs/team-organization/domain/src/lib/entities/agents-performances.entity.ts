import { AgentsPerformancesProps } from '../props/agents-performances.props';
import { AgentsPerformancesStatus } from '../enums/agents-performances-status.enum';

/** Entité liste — module `agents-performances` (workflow-action, volet unique). */
export class AgentsPerformancesEntity {
    constructor(private readonly props: AgentsPerformancesProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get firstName(): string {
        return this.props.firstName;
    }

    get lastName(): string {
        return this.props.lastName;
    }

    get goalsSize(): string {
        return this.props.goalsSize;
    }

    get achievementsSize(): string {
        return this.props.achievementsSize;
    }

    get percentages(): string {
        return this.props.percentages;
    }

    get status(): AgentsPerformancesStatus {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    with(props: AgentsPerformancesProps): AgentsPerformancesEntity {
        if (
            this.uniqId === props.uniqId &&
            this.createdAt === props.createdAt
        ) {
            return this;
        }
        return new AgentsPerformancesEntity(props);
    }
}
