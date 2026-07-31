import { FinalizationDetailsFinalizationState } from '../enums/finalization-details-finalization-state.enum';
import { FinalizationDetailsProps } from '../props/finalization-details.props';

export function finalizationDetailsPermissionsTake(
    props: FinalizationDetailsProps,
    permission: boolean
): boolean {
    return (
        permission &&
        props.finalizationState === FinalizationDetailsFinalizationState.PENDING
    );
}

export function finalizationDetailsPermissionsFinalize(
    props: FinalizationDetailsProps,
    permission: boolean
): boolean {
    return (
        permission &&
        props.finalizationState ===
            FinalizationDetailsFinalizationState.IN_PROGRESS
    );
}
