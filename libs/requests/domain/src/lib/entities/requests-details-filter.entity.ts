import { RequestsDetailsFilterContract } from '../contracts/requests-details-filter.contract';

export function requestsDetailsFilterEntity(
    contract: RequestsDetailsFilterContract
): RequestsDetailsFilterContract {
    return { uniqId: contract.uniqId };
}
