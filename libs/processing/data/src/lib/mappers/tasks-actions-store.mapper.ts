import {
    TasksActionsCreateValidateContract,
    TasksActionsUpdateValidateContract,
} from '@cmz/processing-domain';
import { TasksActionsStoreApiDto } from '../dtos/tasks-actions-api.dto';
import { TasksActionsConformityMapper } from './tasks-actions-conformity.mapper';

type StoreProps =
    TasksActionsCreateValidateContract | TasksActionsUpdateValidateContract;

export function mapTasksActionsStoreDto(
    props: StoreProps,
    conformityMapper: TasksActionsConformityMapper
): TasksActionsStoreApiDto {
    return {
        report_uniq_id: props.reportUniqId,
        date: props.date,
        operator: props.operator.toLowerCase(),
        type_code: props.type,
        description: props.description,
        should_notify_user: props.shouldNotifyUser,
        result: conformityMapper.mapToDto(props.isConform),
    };
}
