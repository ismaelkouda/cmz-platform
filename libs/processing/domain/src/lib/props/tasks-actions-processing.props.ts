import { TelecomOperator } from '@cmz/shared-domain';
import { TasksActionsProcessingConformity } from '../enums/tasks-actions-processing-conformity.enum';

export interface TasksActionsProcessingProps {
    uniqId: string;
    date: Date;
    type: string;
    code: string;
    operators: TelecomOperator[];
    description: string;
    shouldNotifyUser: boolean;
    autoChecked: boolean;
    isConform: TasksActionsProcessingConformity;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
}
