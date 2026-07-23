import { InfrastructureFilterContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureFilterApiDto } from '../dtos/infrastructure-filter-api.dto';

export function infrastructureFilterMapper(
    validContract: InfrastructureFilterContract
): InfrastructureFilterApiDto {
    const params = {} as InfrastructureFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.type) {
        params.type = validContract.type;
    }
    if (validContract.region) {
        params.region_id = validContract.region;
    }
    if (validContract.department) {
        params.department_id = validContract.department;
    }
    if (validContract.municipality) {
        params.municipality_id = validContract.municipality;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    return params;
}
