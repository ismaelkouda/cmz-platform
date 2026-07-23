import { InfrastructureTypeDeleteValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeDeleteApiDto } from '../dtos/infrastructure-type-delete-api.dto';

export function infrastructureTypeDeleteMapper(
    validContract: InfrastructureTypeDeleteValidateContract
): InfrastructureTypeDeleteApiDto {
    const params = {} as InfrastructureTypeDeleteApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
