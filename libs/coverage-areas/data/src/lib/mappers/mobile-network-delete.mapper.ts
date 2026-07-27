import { MobileNetworkDeleteValidateContract } from '@cmz/coverage-areas-domain';
import { MobileNetworkDeleteApiDto } from '../dtos/mobile-network-delete-api.dto';

export function mobileNetworkDeleteMapper(
    validContract: MobileNetworkDeleteValidateContract
): MobileNetworkDeleteApiDto {
    const params = {} as MobileNetworkDeleteApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
