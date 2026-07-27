import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { OpticalFiberNetworkFilterContract } from '../contracts/optical-fiber-network-filter.contract';

export function opticalFiberNetworkFilterEntity(
    contract: OpticalFiberNetworkFilterContract
): OpticalFiberNetworkFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
