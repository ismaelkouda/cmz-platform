import { ProcessingDetailsProcessingState } from '../enums/processing-details-processing-state.enum';
import { ProcessingDetailsProps } from '../props/processing-details.props';

export function processingDetailsPermissionsTake(
    props: ProcessingDetailsProps,
    permission: boolean
): boolean {
    return (
        permission &&
        props.processingState === ProcessingDetailsProcessingState.PENDING
    );
}

export function processingDetailsPermissionsTreat(
    props: ProcessingDetailsProps,
    permission: boolean
): boolean {
    return (
        permission &&
        props.processingState === ProcessingDetailsProcessingState.IN_PROGRESS
    );
}
