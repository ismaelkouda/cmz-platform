import { RequestsDetailsTakeContract } from '../contracts/requests-details-take.contract';

export function requestsDetailsTakeVo(
    contract: RequestsDetailsTakeContract
): RequestsDetailsTakeContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('REQUESTS.DETAILS.TAKE.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
