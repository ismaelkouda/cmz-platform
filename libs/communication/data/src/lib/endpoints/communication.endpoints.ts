/**
 * Les deux entités sont sur `AUTH_API_URL` (pas `SETTINGS_API_URL`) —
 * confirmé dans le source (`MessagingApi`/`NotificationsApi` injectent
 * toutes deux `AUTH_API_URL`).
 */
export const COMMUNICATION_ENDPOINTS = {
    NOTIFICATIONS: 'notifications',
    MESSAGING: 'communication/message-diffusions',
} as const;
