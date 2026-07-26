import { MunicipalityFilterContract } from '../contracts/municipality-filter.contract';
import { validateMunicipalityFilter } from '../validators/municipality-filter.validator';

export function municipalityFilterVo(
    contract: MunicipalityFilterContract
): MunicipalityFilterContract {
    validateMunicipalityFilter(contract);
    return contract;
}
