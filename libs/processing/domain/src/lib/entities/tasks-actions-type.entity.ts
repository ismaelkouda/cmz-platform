import { TelecomOperator } from '@cmz/shared-domain';
import { TasksActionsTypeProps } from '../props/tasks-actions-type.props';

/** Option type d'action (dropdown formulaire). */
export class TasksActionsTypeEntity {
    constructor(private readonly props: TasksActionsTypeProps) {}

    get label(): string {
        return this.props.label;
    }

    get value(): string {
        return this.props.value;
    }

    get operators(): TelecomOperator[] {
        return this.props.operators;
    }
}
