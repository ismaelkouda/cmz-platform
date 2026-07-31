import { TableRowBase } from '@cmz/shared-ui';

export interface TasksActionsProcessingVmProps extends TableRowBase {
    uniqId: string;
    type: string;
    code: string;
    date: string;
    description: string;
    operatorsLabel: string;
    createdBy: string;
    conformLabel: string;
    shouldNotifyUser: boolean;
    actionsRef: string;
}
