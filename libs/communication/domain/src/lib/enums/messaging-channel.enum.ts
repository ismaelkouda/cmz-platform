/** Canal de diffusion d'un message — un message peut cumuler plusieurs canaux. */
export const MessagingChannel = {
    PUSH: 'push',
    MAIL: 'mail',
    SMS: 'sms',
} as const;

export type MessagingChannel =
    (typeof MessagingChannel)[keyof typeof MessagingChannel];
