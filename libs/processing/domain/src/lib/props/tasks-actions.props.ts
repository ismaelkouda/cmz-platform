import { TelecomOperator } from '@cmz/shared-domain';
import { TasksActionsConformity } from '../enums/tasks-actions-conformity.enum';

export interface TasksActionsProps {
    uniqId: string;
    date: Date;
    type: string;
    code: string;
    operators: TelecomOperator[];
    description: string;
    shouldNotifyUser: boolean;
    autoChecked: boolean;
    isConform: TasksActionsConformity;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
}
