import {
    InfrastructureTypeFilterContract,
    Status,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeFilterApiDto } from '../dtos/infrastructure-type-filter-api.dto';

export function infrastructureTypeFilterMapper(
    validContract: InfrastructureTypeFilterContract
): InfrastructureTypeFilterApiDto {
    const params = {} as InfrastructureTypeFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.status !== undefined) {
        params.is_active = validContract.status === Status.ACTIVE;
    }
    return params;
}
