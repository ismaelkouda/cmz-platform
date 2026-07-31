import {
    TasksActionsProcessingCreateValidateContract,
    TasksActionsProcessingUpdateValidateContract,
} from '@cmz/processing-domain';
import { TasksActionsStoreApiDto } from '../dtos/tasks-actions-processing-api.dto';
import { TasksActionsProcessingConformityMapper } from './tasks-actions-processing-conformity.mapper';

type StoreProps =
    | TasksActionsProcessingCreateValidateContract
    | TasksActionsProcessingUpdateValidateContract;

export function mapTasksActionsStoreDto(
    props: StoreProps,
    conformityMapper: TasksActionsProcessingConformityMapper
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
