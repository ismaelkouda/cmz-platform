import { GenericRequiredError } from '@cmz/shared-domain';
import { MunicipalityFindOneFilterContract } from '../contracts/municipality-find-one-filter.contract';
import { MunicipalityFindOneFilterValidateContract } from '../contracts/municipality-find-one-filter.validate-contract';

export function validateMunicipalityFindOneFilter(
    contract: MunicipalityFindOneFilterContract
): asserts contract is MunicipalityFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
