import { OpticalFiberNetworkDeleteValidateContract } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkDeleteApiDto } from '../dtos/optical-fiber-network-delete-api.dto';

export function opticalFiberNetworkDeleteMapper(
    validContract: OpticalFiberNetworkDeleteValidateContract
): OpticalFiberNetworkDeleteApiDto {
    return {
        uniq_id: validContract.uniqId,
    };
}
