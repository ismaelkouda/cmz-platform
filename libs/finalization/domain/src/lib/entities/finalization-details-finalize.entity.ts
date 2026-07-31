import { FinalizationDetailsFinalizeContract } from '../contracts/finalization-details-finalize.contract';
import { finalizationDetailsFinalizeVo } from '../value-objects/finalization-details-finalize.vo';

export class FinalizationDetailsFinalizeEntity {
    constructor(
        public readonly uniqId: string,
        public readonly comment: string
    ) {}

    static fromContract(
        contract: FinalizationDetailsFinalizeContract
    ): FinalizationDetailsFinalizeEntity {
        const resolved = finalizationDetailsFinalizeVo(contract);
        return new FinalizationDetailsFinalizeEntity(
            resolved.uniqId,
            resolved.comment
        );
    }
}
