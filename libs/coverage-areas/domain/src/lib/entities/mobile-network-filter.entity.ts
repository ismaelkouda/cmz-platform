import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { MobileNetworkFilterContract } from '../contracts/mobile-network-filter.contract';

export function mobileNetworkFilterEntity(
    contract: MobileNetworkFilterContract
): MobileNetworkFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
