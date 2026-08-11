import { WorkflowDetailsTakeContract } from '../contracts/workflow-details-take.contract';
import { workflowDetailsTakeVo } from '../value-objects/workflow-details-take.vo';

export class WorkflowDetailsTakeEntity {
    constructor(public readonly uniqId: string) {}

    /** `modulePrefix` — voir `value-objects/workflow-details-filter.vo.ts`. */
    static fromContract(
        contract: WorkflowDetailsTakeContract,
        modulePrefix: string
    ): WorkflowDetailsTakeEntity {
        return new WorkflowDetailsTakeEntity(
            workflowDetailsTakeVo(contract, modulePrefix).uniqId
        );
    }
}
