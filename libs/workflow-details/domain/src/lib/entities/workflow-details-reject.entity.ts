import { WorkflowDetailsEntity } from './workflow-details.entity';
import { WorkflowDetailsQualificationContract } from '../contracts/workflow-details-qualification.contract';

/** Payload reject — dérivé fiche + formulaire qualification. */
export class WorkflowDetailsRejectEntity {
    constructor(
        public readonly uniqId: string,
        public readonly comment: string,
        public readonly reason: string,
        public readonly callbackType: string
    ) {}

    static fromDetails(
        details: WorkflowDetailsEntity,
        qualification: WorkflowDetailsQualificationContract
    ): WorkflowDetailsRejectEntity {
        return new WorkflowDetailsRejectEntity(
            details.uniqId,
            qualification.comment,
            qualification.reason,
            qualification.callbackType ?? ''
        );
    }
}
