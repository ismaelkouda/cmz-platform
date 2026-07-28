import { MessagingChannel } from '@cmz/communication-domain';

export const MESSAGING_CHANNEL_LABEL: Record<MessagingChannel, string> = {
    [MessagingChannel.PUSH]: 'COMMUNICATION.MESSAGING.ENUMS.CHANNELS.PUSH',
    [MessagingChannel.MAIL]: 'COMMUNICATION.MESSAGING.ENUMS.CHANNELS.EMAIL',
    [MessagingChannel.SMS]: 'COMMUNICATION.MESSAGING.ENUMS.CHANNELS.SMS',
};

export const MESSAGING_CHANNEL_OPTIONS = (
    Object.values(MessagingChannel) as MessagingChannel[]
).map((value) => ({ value, label: MESSAGING_CHANNEL_LABEL[value] }));
