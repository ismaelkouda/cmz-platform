import { ProcessingDetailsFilterContract } from '../contracts/processing-details-filter.contract';

export function processingDetailsFilterEntity(
    contract: ProcessingDetailsFilterContract
): ProcessingDetailsFilterContract {
    return { uniqId: contract.uniqId };
}
