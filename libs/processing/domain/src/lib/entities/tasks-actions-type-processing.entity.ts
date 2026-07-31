import { TelecomOperator } from '@cmz/shared-domain';
import { TasksActionsTypeProcessingProps } from '../props/tasks-actions-type-processing.props';

/** Option type d'action (dropdown formulaire). */
export class TasksActionsTypeProcessingEntity {
    constructor(private readonly props: TasksActionsTypeProcessingProps) {}

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
