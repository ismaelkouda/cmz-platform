import { MobileNetworkEnableValidateContract } from '@cmz/coverage-areas-domain';
import { MobileNetworkEnableApiDto } from '../dtos/mobile-network-enable-api.dto';

export function mobileNetworkEnableMapper(
    validContract: MobileNetworkEnableValidateContract
): MobileNetworkEnableApiDto {
    const params = {} as MobileNetworkEnableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
