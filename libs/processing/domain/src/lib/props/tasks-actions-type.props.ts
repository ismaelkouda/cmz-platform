import { TelecomOperator } from '@cmz/shared-domain';

export interface TasksActionsTypeProps {
    label: string;
    value: string;
    operators: TelecomOperator[];
}
