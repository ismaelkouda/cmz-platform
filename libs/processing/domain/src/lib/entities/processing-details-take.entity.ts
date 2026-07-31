import { ProcessingDetailsTakeContract } from '../contracts/processing-details-take.contract';
import { processingDetailsTakeVo } from '../value-objects/processing-details-take.vo';

export class ProcessingDetailsTakeEntity {
    constructor(public readonly uniqId: string) {}

    static fromContract(
        contract: ProcessingDetailsTakeContract
    ): ProcessingDetailsTakeEntity {
        return new ProcessingDetailsTakeEntity(
            processingDetailsTakeVo(contract).uniqId
        );
    }
}
