import { DailyGoalProps } from '../props/daily-goal.props';
import { DailyGoalStatus } from '../enums/daily-goal-status.enum';

/** Entité liste — module `daily-goal` (workflow-action, volet unique). */
export class DailyGoalEntity {
    constructor(private readonly props: DailyGoalProps) {}

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

    get status(): DailyGoalStatus {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    with(props: DailyGoalProps): DailyGoalEntity {
        if (
            this.uniqId === props.uniqId &&
            this.createdAt === props.createdAt
        ) {
            return this;
        }
        return new DailyGoalEntity(props);
    }
}
