import { ProcessingDetailsTakeContract } from '../contracts/processing-details-take.contract';

export function processingDetailsTakeVo(
    contract: ProcessingDetailsTakeContract
): ProcessingDetailsTakeContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('PROCESSING.DETAILS.TAKE.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
