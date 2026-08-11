import { WORKFLOW_DETAILS_WORKFLOW_STEPS } from '../constants/workflow-details-workflow-timestamps.constant';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';
import { WorkflowDetailsWorkflowTimestamp } from '../interfaces/workflow-details-workflow-timestamp.interface';
import { WorkflowDetailsProps } from '../props/workflow-details.props';

/** Timestamps barre workflow — port legacy `managementWorkflowTimestamps` (volet requests). */
export function workflowDetailsWorkflowTimestamps(
    props: WorkflowDetailsProps
): WorkflowDetailsWorkflowTimestamp[] {
    const treater = props.treater;

    return WORKFLOW_DETAILS_WORKFLOW_STEPS.map((step) => {
        let timestamp: string | null = null;

        if (!treater) {
            return { key: step.key, labelKey: step.labelKey, timestamp };
        }

        if (step.key === 'approvedAt' && 'keyAlt' in step && step.keyAlt) {
            switch (props.status) {
                case WorkflowDetailsStatus.APPROVED:
                    timestamp = treater.approvedAt;
                    break;
                case WorkflowDetailsStatus.REJECTED:
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
