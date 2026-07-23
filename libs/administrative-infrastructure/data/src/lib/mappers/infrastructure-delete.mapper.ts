import { InfrastructureDeleteValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureDeleteApiDto } from '../dtos/infrastructure-delete-api.dto';

export function infrastructureDeleteMapper(
    validContract: InfrastructureDeleteValidateContract
): InfrastructureDeleteApiDto {
    const params = {} as InfrastructureDeleteApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
