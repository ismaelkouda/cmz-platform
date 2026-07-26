import { MunicipalityFindOneFilterContract } from '../contracts/municipality-find-one-filter.contract';
import { MunicipalityFindOneFilterValidateContract } from '../contracts/municipality-find-one-filter.validate-contract';
import { validateMunicipalityFindOneFilter } from '../validators/municipality-find-one-filter.validator';

export function municipalityFindOneFilterVo(
    contract: MunicipalityFindOneFilterContract
): MunicipalityFindOneFilterValidateContract {
    validateMunicipalityFindOneFilter(contract);
    return contract as MunicipalityFindOneFilterValidateContract;
}
