import { GenericRequiredError } from '@cmz/shared-domain';
import { NotificationsReadOneValidateContract } from '../contracts/notifications-read-one.validate-contract';

export function validateNotificationsReadOne(
    contract: Partial<NotificationsReadOneValidateContract>
): asserts contract is NotificationsReadOneValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
}
