import { InfrastructureTypeEnableValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeEnableApiDto } from '../dtos/infrastructure-type-enable-api.dto';

export function infrastructureTypeEnableMapper(
    validContract: InfrastructureTypeEnableValidateContract
): InfrastructureTypeEnableApiDto {
    const params = {} as InfrastructureTypeEnableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
