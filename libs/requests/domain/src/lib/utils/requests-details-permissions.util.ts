import { RequestsDetailsQualificationState } from '../enums/requests-details-qualification-state.enum';
import { RequestsDetailsStatus } from '../enums/requests-details-status.enum';
import { RequestsDetailsProps } from '../props/requests-details.props';

export function requestsDetailsPermissionsTake(
    props: RequestsDetailsProps,
    permission: boolean
): boolean {
    return permission && props.status === RequestsDetailsStatus.PENDING;
}

export function requestsDetailsPermissionsQualify(
    props: RequestsDetailsProps,
    permission: boolean
): boolean {
    return (
        permission &&
        props.status === RequestsDetailsStatus.IN_PROGRESS &&
        props.qualificationState === RequestsDetailsQualificationState.PENDING
    );
}

export function requestsDetailsPermissionsReject(
    props: RequestsDetailsProps,
    permission: boolean
): boolean {
    return permission && props.status === RequestsDetailsStatus.IN_PROGRESS;
}

export function requestsDetailsPermissionsRejectContext(
    props: RequestsDetailsProps
): boolean {
    return props.status === RequestsDetailsStatus.IN_PROGRESS;
}
