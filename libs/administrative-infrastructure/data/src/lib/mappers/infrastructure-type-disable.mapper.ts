import { InfrastructureTypeDisableValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeDisableApiDto } from '../dtos/infrastructure-type-disable-api.dto';

export function infrastructureTypeDisableMapper(
    validContract: InfrastructureTypeDisableValidateContract
): InfrastructureTypeDisableApiDto {
    const params = {} as InfrastructureTypeDisableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
