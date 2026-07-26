import { MunicipalityFindOneFilterValidateContract } from '@cmz/administrative-boundary-domain';
import { MunicipalityFindOneFilterApiDto } from '../dtos/municipality-find-one-filter-api.dto';

export function municipalityFindOneFilterMapper(
    validContract: MunicipalityFindOneFilterValidateContract
): MunicipalityFindOneFilterApiDto {
    const params = {} as MunicipalityFindOneFilterApiDto;
    params.uniq_id = validContract.uniqId;
    return params;
}
