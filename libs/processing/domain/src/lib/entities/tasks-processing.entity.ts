import { TasksProcessingProps } from '../props/tasks-processing.props';

/** Entité liste — volet « Tâches » (`TasksEntity` legacy). */
export class TasksProcessingEntity {
    constructor(private readonly props: TasksProcessingProps) {}

    get type(): TasksProcessingProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): TasksProcessingProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): TasksProcessingProps['operators'] {
        return this.props.operators;
    }

    get source(): TasksProcessingProps['source'] {
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

    with(props: TasksProcessingProps): TasksProcessingEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new TasksProcessingEntity(props);
    }
}
