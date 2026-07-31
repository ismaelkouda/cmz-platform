import { TelecomOperator } from '@cmz/shared-domain';
import {
    TasksActionsProcessingConformity,
    TasksActionsProcessingConformityStyle,
} from '../enums/tasks-actions-processing-conformity.enum';
import { TasksActionsProcessingProps } from '../props/tasks-actions-processing.props';

/** Entité action de traitement — sous-graphe `tasks/actions` (legacy `TasksActionsProcessingEntity`). */
export class TasksActionsProcessingEntity {
    constructor(private readonly props: TasksActionsProcessingProps) {}

    get actionsRef(): string {
        return this.props.type;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get date(): Date {
        return this.props.date;
    }

    get formatDate(): string {
        return this.props.date.toLocaleString('fr-FR');
    }

    get type(): string {
        return this.props.type;
    }

    get code(): string {
        return this.props.code;
    }

    get operators(): TelecomOperator[] {
        return this.props.operators;
    }

    get description(): string {
        return this.props.description;
    }

    get shouldNotifyUser(): boolean {
        return this.props.shouldNotifyUser;
    }

    get autoChecked(): boolean {
        return this.props.autoChecked;
    }

    get isConform(): TasksActionsProcessingConformity {
        return this.props.isConform;
    }

    conformStyle(
        conform: TasksActionsProcessingConformity
    ): TasksActionsProcessingConformityStyle {
        const map: Record<
            TasksActionsProcessingConformity,
            TasksActionsProcessingConformityStyle
        > = {
            [TasksActionsProcessingConformity.CONFORM]:
                TasksActionsProcessingConformityStyle.CONFORM,
            [TasksActionsProcessingConformity.NON_CONFORM]:
                TasksActionsProcessingConformityStyle.NON_CONFORM,
            [TasksActionsProcessingConformity.IN_PROGRESS]:
                TasksActionsProcessingConformityStyle.IN_PROGRESS,
            [TasksActionsProcessingConformity.UNKNOWN]:
                TasksActionsProcessingConformityStyle.UNKNOWN,
        };
        return map[conform];
    }

    get createdBy(): string {
        return this.props.createdBy;
    }

    get updatedBy(): string {
        return this.props.updatedBy;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: TasksActionsProcessingProps): TasksActionsProcessingEntity {
        if (
            this.uniqId === props.uniqId &&
            this.updatedAt === props.updatedAt
        ) {
            return this;
        }
        return new TasksActionsProcessingEntity(props);
    }
}
