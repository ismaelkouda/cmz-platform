import { RequestsDetailsEntity } from './requests-details.entity';
import { RequestsDetailsQualificationContract } from '../contracts/requests-details-qualification.contract';

/** Payload reject — dérivé fiche + formulaire qualification. */
export class RequestsDetailsRejectEntity {
    constructor(
        public readonly uniqId: string,
        public readonly comment: string,
        public readonly reason: string,
        public readonly callbackType: string
    ) {}

    static fromDetails(
        details: RequestsDetailsEntity,
        qualification: RequestsDetailsQualificationContract
    ): RequestsDetailsRejectEntity {
        return new RequestsDetailsRejectEntity(
            details.uniqId,
            qualification.comment,
            qualification.reason,
            qualification.callbackType ?? ''
        );
    }
}
