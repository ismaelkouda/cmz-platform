import { WorkflowDetailsQualificationState } from '../enums/workflow-details-qualification-state.enum';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';
import { WorkflowDetailsProps } from '../props/workflow-details.props';

export function workflowDetailsPermissionsTake(
    props: WorkflowDetailsProps,
    permission: boolean
): boolean {
    return permission && props.status === WorkflowDetailsStatus.PENDING;
}

export function workflowDetailsPermissionsQualify(
    props: WorkflowDetailsProps,
    permission: boolean
): boolean {
    return (
        permission &&
        props.status === WorkflowDetailsStatus.IN_PROGRESS &&
        props.qualificationState === WorkflowDetailsQualificationState.PENDING
    );
}

export function workflowDetailsPermissionsReject(
    props: WorkflowDetailsProps,
    permission: boolean
): boolean {
    return permission && props.status === WorkflowDetailsStatus.IN_PROGRESS;
}

export function workflowDetailsPermissionsRejectContext(
    props: WorkflowDetailsProps
): boolean {
    return props.status === WorkflowDetailsStatus.IN_PROGRESS;
}
