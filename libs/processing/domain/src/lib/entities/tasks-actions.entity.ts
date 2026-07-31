import { TelecomOperator } from '@cmz/shared-domain';
import {
    TasksActionsConformity,
    TasksActionsConformityStyle,
} from '../enums/tasks-actions-conformity.enum';
import { TasksActionsProps } from '../props/tasks-actions.props';

/** Entité action de traitement — sous-graphe `tasks/actions` (legacy `TasksActionsEntity`). */
export class TasksActionsEntity {
    constructor(private readonly props: TasksActionsProps) {}

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

    get isConform(): TasksActionsConformity {
        return this.props.isConform;
    }

    conformStyle(conform: TasksActionsConformity): TasksActionsConformityStyle {
        const map: Record<TasksActionsConformity, TasksActionsConformityStyle> =
            {
                [TasksActionsConformity.CONFORM]:
                    TasksActionsConformityStyle.CONFORM,
                [TasksActionsConformity.NON_CONFORM]:
                    TasksActionsConformityStyle.NON_CONFORM,
                [TasksActionsConformity.IN_PROGRESS]:
                    TasksActionsConformityStyle.IN_PROGRESS,
                [TasksActionsConformity.UNKNOWN]:
                    TasksActionsConformityStyle.UNKNOWN,
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

    with(props: TasksActionsProps): TasksActionsEntity {
        if (
            this.uniqId === props.uniqId &&
            this.updatedAt === props.updatedAt
        ) {
            return this;
        }
        return new TasksActionsEntity(props);
    }
}
