import { WorkflowDetailsTakeContract } from '../contracts/workflow-details-take.contract';

/** `modulePrefix` — voir `workflow-details-filter.vo.ts` pour la justification. */
export function workflowDetailsTakeVo(
    contract: WorkflowDetailsTakeContract,
    modulePrefix: string
): WorkflowDetailsTakeContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error(`${modulePrefix}.DETAILS.TAKE.UNIQ_ID_REQUIRED`);
    }
    return { uniqId };
}
