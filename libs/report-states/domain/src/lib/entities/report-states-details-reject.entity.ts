import { ReportStatesDetailsEntity } from './report-states-details.entity';
import { ReportStatesDetailsQualificationContract } from '../contracts/report-states-details-qualification.contract';

/** Payload reject — dérivé fiche + formulaire qualification. */
export class ReportStatesDetailsRejectEntity {
    constructor(
        public readonly uniqId: string,
        public readonly comment: string,
        public readonly reason: string,
        public readonly callbackType: string
    ) {}

    static fromDetails(
        details: ReportStatesDetailsEntity,
        qualification: ReportStatesDetailsQualificationContract
    ): ReportStatesDetailsRejectEntity {
        return new ReportStatesDetailsRejectEntity(
            details.uniqId,
            qualification.comment,
            qualification.reason,
            qualification.callbackType ?? ''
        );
    }
}
