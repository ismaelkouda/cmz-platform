import { InfrastructureTypeFindOneFilterValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeFindOneFilterApiDto } from '../dtos/infrastructure-type-find-one-filter-api.dto';

export function infrastructureTypeFindOneFilterMapper(
    validContract: InfrastructureTypeFindOneFilterValidateContract
): InfrastructureTypeFindOneFilterApiDto {
    const params = {} as InfrastructureTypeFindOneFilterApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
    return params;
}
