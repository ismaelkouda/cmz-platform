import { OpticalFiberNetworkDisableValidateContract } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkDisableApiDto } from '../dtos/optical-fiber-network-disable-api.dto';

export function opticalFiberNetworkDisableMapper(
    validContract: OpticalFiberNetworkDisableValidateContract
): OpticalFiberNetworkDisableApiDto {
    return {
        uniq_id: validContract.uniqId,
    };
}
