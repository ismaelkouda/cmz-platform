import { REQUESTS_DETAILS_WORKFLOW_STEPS } from '../constants/requests-details-workflow-timestamps.constant';
import { RequestsDetailsStatus } from '../enums/requests-details-status.enum';
import { RequestsDetailsWorkflowTimestamp } from '../interfaces/requests-details-workflow-timestamp.interface';
import { RequestsDetailsProps } from '../props/requests-details.props';

/** Timestamps barre workflow — port legacy `managementWorkflowTimestamps` (volet requests). */
export function requestsDetailsWorkflowTimestamps(
    props: RequestsDetailsProps
): RequestsDetailsWorkflowTimestamp[] {
    const treater = props.treater;

    return REQUESTS_DETAILS_WORKFLOW_STEPS.map((step) => {
        let timestamp: string | null = null;

        if (!treater) {
            return { key: step.key, labelKey: step.labelKey, timestamp };
        }

        if (step.key === 'approvedAt' && 'keyAlt' in step && step.keyAlt) {
            switch (props.status) {
                case RequestsDetailsStatus.APPROVED:
                    timestamp = treater.approvedAt;
                    break;
                case RequestsDetailsStatus.REJECTED:
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
