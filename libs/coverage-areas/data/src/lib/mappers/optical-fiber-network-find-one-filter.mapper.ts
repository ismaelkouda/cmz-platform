import { OpticalFiberNetworkFindOneFilterValidateContract } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkFindOneFilterApiDto } from '../dtos/optical-fiber-network-find-one-filter-api.dto';

export function opticalFiberNetworkFindOneFilterMapper(
    validContract: OpticalFiberNetworkFindOneFilterValidateContract
): OpticalFiberNetworkFindOneFilterApiDto {
    return {
        id: validContract.uniqId,
    };
}
