import { MessagingType } from '@cmz/communication-domain';

/** Clés i18n des libellés de type de message — présentation pure. */
export const MESSAGING_TYPE_LABEL: Record<MessagingType, string> = {
    [MessagingType.TIP]: 'COMMUNICATION.MESSAGING.ENUMS.TYPE.TIP',
    [MessagingType.EDUCATION]: 'COMMUNICATION.MESSAGING.ENUMS.TYPE.EDUCATION',
    [MessagingType.INFO]: 'COMMUNICATION.MESSAGING.ENUMS.TYPE.INFO',
    [MessagingType.AWARENESS]: 'COMMUNICATION.MESSAGING.ENUMS.TYPE.AWARENESS',
};

export const MESSAGING_TYPE_OPTIONS = (
    Object.values(MessagingType) as MessagingType[]
).map((value) => ({ value, label: MESSAGING_TYPE_LABEL[value] }));
