import { TelecomOperator } from '@cmz/shared-domain';

export interface TasksActionsTypeProcessingProps {
    label: string;
    value: string;
    operators: TelecomOperator[];
}
