import { ReportStatesDetailsQualificationState } from '../enums/report-states-details-qualification-state.enum';
import { ReportStatesDetailsStatus } from '../enums/report-states-details-status.enum';
import { ReportStatesDetailsProps } from '../props/report-states-details.props';

export function reportStatesDetailsPermissionsTake(
    props: ReportStatesDetailsProps,
    permission: boolean
): boolean {
    return permission && props.status === ReportStatesDetailsStatus.PENDING;
}

export function reportStatesDetailsPermissionsQualify(
    props: ReportStatesDetailsProps,
    permission: boolean
): boolean {
    return (
        permission &&
        props.status === ReportStatesDetailsStatus.IN_PROGRESS &&
        props.qualificationState ===
            ReportStatesDetailsQualificationState.PENDING
    );
}

export function reportStatesDetailsPermissionsReject(
    props: ReportStatesDetailsProps,
    permission: boolean
): boolean {
    return permission && props.status === ReportStatesDetailsStatus.IN_PROGRESS;
}

export function reportStatesDetailsPermissionsRejectContext(
    props: ReportStatesDetailsProps
): boolean {
    return props.status === ReportStatesDetailsStatus.IN_PROGRESS;
}
