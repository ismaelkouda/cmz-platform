import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { RadioRelayLinksFilterContract } from '../contracts/radio-relay-links-filter.contract';

export function radioRelayLinksFilterEntity(
    contract: RadioRelayLinksFilterContract
): RadioRelayLinksFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
