import { WorkflowDetailsEntity } from './workflow-details.entity';
import { WorkflowDetailsQualificationContract } from '../contracts/workflow-details-qualification.contract';
import { workflowDetailsQualificationVo } from '../value-objects/workflow-details-qualification.vo';

/** Payload approve — dérivé fiche + formulaire qualification. */
export class WorkflowDetailsApproveEntity {
    constructor(
        public readonly uniqId: string,
        public readonly comment: string,
        public readonly approvalType: string,
        public readonly callbackType: string | null,
        public readonly latitude: number,
        public readonly longitude: number,
        public readonly locationName: string,
        public readonly reportType: string,
        public readonly operators: string[],
        public readonly description: string,
        public readonly decision: string,
        public readonly placeDescription: string,
        public readonly reason: string | null,
        public readonly placePhoto: string | File | null
    ) {}

    /** `modulePrefix` — voir `value-objects/workflow-details-filter.vo.ts`. */
    static fromDetails(
        details: WorkflowDetailsEntity,
        qualification: WorkflowDetailsQualificationContract,
        modulePrefix: string
    ): WorkflowDetailsApproveEntity {
        const normalized = workflowDetailsQualificationVo(
            qualification,
            modulePrefix
        );
        const edit = normalized.editFields;
        const useEdit =
            normalized.approvalType === 'edit' ||
            normalized.approvalType === 'callback';

        const { location } = details;

        return new WorkflowDetailsApproveEntity(
            details.uniqId,
            normalized.comment,
            normalized.approvalType,
            normalized.callbackType,
            useEdit && edit ? edit.latitude : location.coordinates.latitude,
            useEdit && edit ? edit.longitude : location.coordinates.longitude,
            useEdit && edit ? edit.locationName : location.name,
            useEdit && edit ? edit.reportType : details.reportType,
            useEdit && edit ? [...edit.operators] : [...details.operators],
            useEdit && edit ? edit.description : details.description,
            'accepted',
            useEdit && edit ? edit.placeDescription : details.placeDescription,
            normalized.reason || null,
            useEdit && edit
                ? edit.placePhoto
                : details.placePhoto || details.media?.placePhoto || null
        );
    }
}
