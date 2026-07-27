import { OpticalFiberNetworkFilterContract } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkFilterApiDto } from '../dtos/optical-fiber-network-filter-api.dto';

export function opticalFiberNetworkFilterMapper(
    validContract: OpticalFiberNetworkFilterContract
): OpticalFiberNetworkFilterApiDto {
    const params = {} as OpticalFiberNetworkFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.operator) {
        params.operator = validContract.operator;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    return params;
}
