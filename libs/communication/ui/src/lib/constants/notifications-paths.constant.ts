/**
 * Pas de `FORM` : `notifications` est une entité en lecture seule côté UI
 * (aucun create/update/delete, cf. `NotificationsRepository` — seuls
 * `readOne`/`readAll` existent). L'unique action de ligne (« marquer comme
 * lu ») est un bouton, pas une page.
 */
export const NOTIFICATIONS_LIST = 'list';
export const NOTIFICATIONS_ROUTE = 'notifications';
