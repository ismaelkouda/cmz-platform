import { WorkflowDetailsFilterContract } from '../contracts/workflow-details-filter.contract';

export function workflowDetailsFilterEntity(
    contract: WorkflowDetailsFilterContract
): WorkflowDetailsFilterContract {
    return { uniqId: contract.uniqId };
}
