import { GenericRequiredError } from '@cmz/shared-domain';
import { MunicipalityDeleteContract } from '../contracts/municipality-delete.contract';
import { MunicipalityDeleteValidateContract } from '../contracts/municipality-delete.validate-contract';

export function validateMunicipalityDelete(
    contract: MunicipalityDeleteContract
): asserts contract is MunicipalityDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
