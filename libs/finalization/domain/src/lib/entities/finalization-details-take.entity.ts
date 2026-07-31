import { FinalizationDetailsTakeContract } from '../contracts/finalization-details-take.contract';
import { finalizationDetailsTakeVo } from '../value-objects/finalization-details-take.vo';

export class FinalizationDetailsTakeEntity {
    constructor(public readonly uniqId: string) {}

    static fromContract(
        contract: FinalizationDetailsTakeContract
    ): FinalizationDetailsTakeEntity {
        return new FinalizationDetailsTakeEntity(
            finalizationDetailsTakeVo(contract).uniqId
        );
    }
}
