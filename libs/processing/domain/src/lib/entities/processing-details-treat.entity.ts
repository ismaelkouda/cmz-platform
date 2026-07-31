import { ProcessingDetailsTreatContract } from '../contracts/processing-details-treat.contract';
import { processingDetailsTreatVo } from '../value-objects/processing-details-treat.vo';

export class ProcessingDetailsTreatEntity {
    constructor(
        public readonly uniqId: string,
        public readonly comment?: string
    ) {}

    static fromContract(
        contract: ProcessingDetailsTreatContract
    ): ProcessingDetailsTreatEntity {
        const resolved = processingDetailsTreatVo(contract);
        return new ProcessingDetailsTreatEntity(
            resolved.uniqId,
            resolved.comment
        );
    }
}
