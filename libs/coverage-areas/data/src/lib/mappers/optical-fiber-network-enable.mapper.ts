import { OpticalFiberNetworkEnableValidateContract } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkEnableApiDto } from '../dtos/optical-fiber-network-enable-api.dto';

export function opticalFiberNetworkEnableMapper(
    validContract: OpticalFiberNetworkEnableValidateContract
): OpticalFiberNetworkEnableApiDto {
    return {
        uniq_id: validContract.uniqId,
    };
}
