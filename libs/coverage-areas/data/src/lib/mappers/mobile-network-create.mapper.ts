import { MobileNetworkCreateValidateContract } from '@cmz/coverage-areas-domain';
import { MobileNetworkCreateApiDto } from '../dtos/mobile-network-create-api.dto';

export function mobileNetworkCreateMapper(
    validContract: MobileNetworkCreateValidateContract
): MobileNetworkCreateApiDto {
    const params = {} as MobileNetworkCreateApiDto;
    if (validContract.siteId) {
        params.site_id = validContract.siteId;
    }
    if (validContract.siteName) {
        params.site_name = validContract.siteName;
    }
    if (validContract.infrastructureType) {
        params.infrastructure_type = validContract.infrastructureType;
    }
    if (validContract.towerTypeId) {
        params.tower_type_id = validContract.towerTypeId;
    }
    if (validContract.towerSize !== undefined) {
        params.tower_size = validContract.towerSize;
    }
    if (validContract.technology?.length) {
        params.technology = validContract.technology;
    }
    if (validContract.operator) {
        params.operator = validContract.operator;
    }
    if (validContract.radius !== undefined) {
        params.radius = validContract.radius;
    }
    return params;
}
