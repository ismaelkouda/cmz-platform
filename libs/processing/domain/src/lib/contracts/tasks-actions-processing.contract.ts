import { TasksActionsProcessingConformity } from '../enums/tasks-actions-processing-conformity.enum';

export interface TasksActionsProcessingFilterContract {
    reportUniqId?: string;
}

export interface TasksActionsProcessingFilterValidateContract {
    reportUniqId: string;
}

export interface TasksActionsProcessingCreateContract {
    reportUniqId?: string;
    date?: Date;
    type?: string;
    operator?: string;
    description?: string;
    shouldNotifyUser?: boolean;
    isConform?: TasksActionsProcessingConformity | null;
}

export interface TasksActionsProcessingCreateValidateContract {
    reportUniqId: string;
    date: Date;
    type: string;
    operator: string;
    description: string;
    shouldNotifyUser: boolean;
    isConform: TasksActionsProcessingConformity;
}

export interface TasksActionsProcessingUpdateContract {
    uniqId?: string;
    reportUniqId?: string;
    date?: Date;
    type?: string;
    operator?: string;
    description?: string;
    shouldNotifyUser?: boolean;
    isConform?: TasksActionsProcessingConformity | null;
}

export interface TasksActionsProcessingUpdateValidateContract {
    uniqId: string;
    reportUniqId: string;
    date: Date;
    type: string;
    operator: string;
    description: string;
    shouldNotifyUser: boolean;
    isConform: TasksActionsProcessingConformity;
}

export interface TasksActionsProcessingDeleteContract {
    uniqId?: string;
}

export interface TasksActionsProcessingDeleteValidateContract {
    uniqId: string;
}

export interface TasksActionsTypeProcessingFilterContract {
    reportUniqId?: string;
}

export interface TasksActionsTypeProcessingFilterValidateContract {
    reportUniqId: string;
}
