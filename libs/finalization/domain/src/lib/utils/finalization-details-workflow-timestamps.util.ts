import { FINALIZATION_DETAILS_WORKFLOW_STEPS } from '../constants/finalization-details-workflow-timestamps.constant';
import { FinalizationDetailsStatus } from '../enums/finalization-details-status.enum';
import { FinalizationDetailsWorkflowTimestamp } from '../interfaces/finalization-details-workflow-timestamp.interface';
import { FinalizationDetailsProps } from '../props/finalization-details.props';

/** Timestamps barre workflow — port legacy `managementWorkflowTimestamps` (volet requests). */
export function finalizationDetailsWorkflowTimestamps(
    props: FinalizationDetailsProps
): FinalizationDetailsWorkflowTimestamp[] {
    const treater = props.treater;

    return FINALIZATION_DETAILS_WORKFLOW_STEPS.map((step) => {
        let timestamp: string | null = null;

        if (!treater) {
            return { key: step.key, labelKey: step.labelKey, timestamp };
        }

        if (step.key === 'approvedAt' && 'keyAlt' in step && step.keyAlt) {
            switch (props.status) {
                case FinalizationDetailsStatus.APPROVED:
                    timestamp = treater.approvedAt;
                    break;
                case FinalizationDetailsStatus.REJECTED:
                    timestamp = treater.rejectedAt;
                    break;
                default: {
                    const keys = [step.key, step.keyAlt] as const;
                    for (const key of keys) {
                        const value = treater[key];
                        if (value) {
                            timestamp = value;
                            break;
                        }
                    }
                }
            }
        } else {
            timestamp = treater[step.key];
        }

        return { key: step.key, labelKey: step.labelKey, timestamp };
    });
}
