import { MunicipalityDeleteContract } from '../contracts/municipality-delete.contract';
import { MunicipalityDeleteValidateContract } from '../contracts/municipality-delete.validate-contract';
import { validateMunicipalityDelete } from '../validators/municipality-delete.validator';

export function municipalityDeleteVo(
    contract: MunicipalityDeleteContract
): MunicipalityDeleteValidateContract {
    validateMunicipalityDelete(contract);
    return contract as MunicipalityDeleteValidateContract;
}
