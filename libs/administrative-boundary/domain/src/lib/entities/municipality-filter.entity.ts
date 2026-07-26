import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { MunicipalityFilterContract } from '../contracts/municipality-filter.contract';

export function municipalityFilterEntity(
    contract: MunicipalityFilterContract
): MunicipalityFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
