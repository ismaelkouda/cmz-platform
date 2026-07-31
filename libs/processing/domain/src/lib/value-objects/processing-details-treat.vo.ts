import { ProcessingDetailsTreatContract } from '../contracts/processing-details-treat.contract';

export function processingDetailsTreatVo(
    contract: ProcessingDetailsTreatContract
): ProcessingDetailsTreatContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('PROCESSING.DETAILS.TREAT.UNIQ_ID_REQUIRED');
    }
    return {
        uniqId,
        comment: contract.comment?.trim() || undefined,
    };
}
