import { MessagingTarget } from '@cmz/communication-domain';

export const MESSAGING_TARGET_LABEL: Record<MessagingTarget, string> = {
    [MessagingTarget.REPORT]: 'COMMUNICATION.MESSAGING.ENUMS.TARGET.REPORT',
    [MessagingTarget.AREA]: 'COMMUNICATION.MESSAGING.ENUMS.TARGET.AREA',
};

export const MESSAGING_TARGET_OPTIONS = (
    Object.values(MessagingTarget) as MessagingTarget[]
).map((value) => ({ value, label: MESSAGING_TARGET_LABEL[value] }));
