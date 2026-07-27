import { MobileNetworkFindOneFilterValidateContract } from '@cmz/coverage-areas-domain';
import { MobileNetworkFindOneFilterApiDto } from '../dtos/mobile-network-find-one-filter-api.dto';

export function mobileNetworkFindOneFilterMapper(
    validContract: MobileNetworkFindOneFilterValidateContract
): MobileNetworkFindOneFilterApiDto {
    const params = {} as MobileNetworkFindOneFilterApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
    return params;
}
