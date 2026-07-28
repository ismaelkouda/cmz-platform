import { GenericRequiredError } from '@cmz/shared-domain';
import { DashboardFilterContract } from '../contracts/dashboard-filter.contract';
import { DashboardFilterValidateContract } from '../contracts/dashboard-filter.validate-contract';
import { isPeriod } from '../enums/period.enum';
import { InvalidPeriodError } from '../errors/invalid-period.error';

export function validateDashboardFilter(
    contract: DashboardFilterContract
): asserts contract is DashboardFilterValidateContract {
    if (!contract.period) {
        throw new GenericRequiredError('Period is required');
    }
    if (!isPeriod(contract.period)) {
        throw new InvalidPeriodError();
    }
}
