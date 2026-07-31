import { TasksActionsConformity } from '../enums/tasks-actions-conformity.enum';

export interface TasksActionsFilterContract {
    reportUniqId?: string;
}

export interface TasksActionsFilterValidateContract {
    reportUniqId: string;
}

export interface TasksActionsCreateContract {
    reportUniqId?: string;
    date?: Date;
    type?: string;
    operator?: string;
    description?: string;
    shouldNotifyUser?: boolean;
    isConform?: TasksActionsConformity | null;
}

export interface TasksActionsCreateValidateContract {
    reportUniqId: string;
    date: Date;
    type: string;
    operator: string;
    description: string;
    shouldNotifyUser: boolean;
    isConform: TasksActionsConformity;
}

export interface TasksActionsUpdateContract {
    uniqId?: string;
    reportUniqId?: string;
    date?: Date;
    type?: string;
    operator?: string;
    description?: string;
    shouldNotifyUser?: boolean;
    isConform?: TasksActionsConformity | null;
}

export interface TasksActionsUpdateValidateContract {
    uniqId: string;
    reportUniqId: string;
    date: Date;
    type: string;
    operator: string;
    description: string;
    shouldNotifyUser: boolean;
    isConform: TasksActionsConformity;
}

export interface TasksActionsDeleteContract {
    uniqId?: string;
}

export interface TasksActionsDeleteValidateContract {
    uniqId: string;
}

export interface TasksActionsTypeFilterContract {
    reportUniqId?: string;
}

export interface TasksActionsTypeFilterValidateContract {
    reportUniqId: string;
}
