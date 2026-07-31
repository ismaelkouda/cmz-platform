import { RequestsDetailsFilterContract } from '../contracts/requests-details-filter.contract';

export function requestsDetailsFilterVo(
    contract: RequestsDetailsFilterContract
): RequestsDetailsFilterContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('REQUESTS.DETAILS.FILTER.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
