import { InfrastructureTypeUpdateValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeUpdateApiDto } from '../dtos/infrastructure-type-update-api.dto';

export function infrastructureTypeUpdateMapper(
    validContract: InfrastructureTypeUpdateValidateContract
): InfrastructureTypeUpdateApiDto {
    const params = {} as InfrastructureTypeUpdateApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
    if (validContract.name) {
        params.name = validContract.name;
    }
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
