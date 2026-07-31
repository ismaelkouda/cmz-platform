import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingUpdateContract } from '../contracts/messaging-update.contract';
import { MessagingUpdateValidateContract } from '../contracts/messaging-update.validate-contract';
import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingSmsContentTooLongError } from '../errors/messaging-sms-content-too-long.error';
import { TypeRequiredError } from '../errors/type-required.error';

const SMS_MAX_LENGTH = 160;

export function validateMessagingUpdate(
    contract: MessagingUpdateContract
): asserts contract is MessagingUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
    if (!contract.type) {
        throw new TypeRequiredError();
    }
    if (!contract.targetType) {
        throw new GenericRequiredError('Target type is required');
    }
    if (contract.targetType === MessagingTarget.REPORT && !contract.reportId) {
        throw new GenericRequiredError(
            'Report id is required when target is a report'
        );
    }
    if (contract.targetType === MessagingTarget.AREA && !contract.region) {
        throw new GenericRequiredError(
            'Region is required when target is an area'
        );
    }
    if (!contract.channels || contract.channels.length < 1) {
        throw new GenericRequiredError('At least one channel is required');
    }
    if (!contract.subject) {
        throw new GenericRequiredError('Subject is required');
    }
    if (!contract.content) {
        throw new GenericRequiredError('Content is required');
    }
    if (
        contract.channels.includes(MessagingChannel.SMS) &&
        contract.content.length > SMS_MAX_LENGTH
    ) {
        throw new MessagingSmsContentTooLongError();
    }
}
