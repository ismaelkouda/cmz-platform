import { MunicipalityDeleteValidateContract } from '@cmz/administrative-boundary-domain';
import { MunicipalityDeleteApiDto } from '../dtos/municipality-delete-api.dto';

export function municipalityDeleteMapper(
    validContract: MunicipalityDeleteValidateContract
): MunicipalityDeleteApiDto {
    const params = {} as MunicipalityDeleteApiDto;
    params.uniq_id = validContract.uniqId;
    return params;
}
