import { TasksRequestsProps } from '../props/tasks-requests.props';

/** Entité liste — volet « Tâches » (`TasksEntity` legacy). */
export class TasksRequestsEntity {
    constructor(private readonly props: TasksRequestsProps) {}

    get type(): TasksRequestsProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): TasksRequestsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): TasksRequestsProps['operators'] {
        return this.props.operators;
    }

    get source(): TasksRequestsProps['source'] {
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

    with(props: TasksRequestsProps): TasksRequestsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new TasksRequestsEntity(props);
    }
}
