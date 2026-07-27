import { MobileNetworkFilterContract } from '@cmz/coverage-areas-domain';
import { MobileNetworkFilterApiDto } from '../dtos/mobile-network-filter-api.dto';

export function mobileNetworkFilterMapper(
    validContract: MobileNetworkFilterContract
): MobileNetworkFilterApiDto {
    const params = {} as MobileNetworkFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.towerTypeId) {
        params.tower_type_id = validContract.towerTypeId;
    }
    if (validContract.towerSize !== undefined) {
        params.tower_size = validContract.towerSize;
    }
    if (validContract.technology) {
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
