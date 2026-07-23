import { InfrastructureFindOneFilterValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureFindOneFilterApiDto } from '../dtos/infrastructure-find-one-filter-api.dto';

export function infrastructureFindOneFilterMapper(
    validContract: InfrastructureFindOneFilterValidateContract
): InfrastructureFindOneFilterApiDto {
    const params = {} as InfrastructureFindOneFilterApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
    return params;
}
