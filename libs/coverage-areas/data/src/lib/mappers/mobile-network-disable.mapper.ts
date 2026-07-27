import { MobileNetworkDisableValidateContract } from '@cmz/coverage-areas-domain';
import { MobileNetworkDisableApiDto } from '../dtos/mobile-network-disable-api.dto';

export function mobileNetworkDisableMapper(
    validContract: MobileNetworkDisableValidateContract
): MobileNetworkDisableApiDto {
    const params = {} as MobileNetworkDisableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
