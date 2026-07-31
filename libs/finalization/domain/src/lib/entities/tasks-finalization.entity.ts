import { TasksFinalizationProps } from '../props/tasks-finalization.props';

/** Entité liste — volet « Tâches » (`TasksEntity` legacy). */
export class TasksFinalizationEntity {
    constructor(private readonly props: TasksFinalizationProps) {}

    get type(): TasksFinalizationProps['type'] {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): TasksFinalizationProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): TasksFinalizationProps['operators'] {
        return this.props.operators;
    }

    get source(): TasksFinalizationProps['source'] {
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

    with(props: TasksFinalizationProps): TasksFinalizationEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new TasksFinalizationEntity(props);
    }
}
