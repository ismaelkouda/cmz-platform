import { ProcessingDetailsFilterContract } from '../contracts/processing-details-filter.contract';

export function processingDetailsFilterVo(
    contract: ProcessingDetailsFilterContract
): ProcessingDetailsFilterContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('PROCESSING.DETAILS.FILTER.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
