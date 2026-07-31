import { REPORT_STATES_DETAILS_WORKFLOW_STEPS } from '../constants/report-states-details-workflow-timestamps.constant';
import { ReportStatesDetailsStatus } from '../enums/report-states-details-status.enum';
import { ReportStatesDetailsWorkflowTimestamp } from '../interfaces/report-states-details-workflow-timestamp.interface';
import { ReportStatesDetailsProps } from '../props/report-states-details.props';

/** Timestamps barre workflow — port legacy `managementWorkflowTimestamps` (volet requests). */
export function reportStatesDetailsWorkflowTimestamps(
    props: ReportStatesDetailsProps
): ReportStatesDetailsWorkflowTimestamp[] {
    const treater = props.treater;

    return REPORT_STATES_DETAILS_WORKFLOW_STEPS.map((step) => {
        let timestamp: string | null = null;

        if (!treater) {
            return { key: step.key, labelKey: step.labelKey, timestamp };
        }

        if (step.key === 'approvedAt' && 'keyAlt' in step && step.keyAlt) {
            switch (props.status) {
                case ReportStatesDetailsStatus.APPROVED:
                    timestamp = treater.approvedAt;
                    break;
                case ReportStatesDetailsStatus.REJECTED:
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
