/**
 * Sections du module `requests` — alignées sur `REQUESTS_ENDPOINTS` :
 *  - QUEUES → requests/queues
 *  - TASKS  → requests/task-baskets
 *  - ALL    → requests/qualified
 */
export enum RequestsSection {
    QUEUES = 'requests/queues',
    TASKS = 'requests/task-baskets',
    ALL = 'requests/qualified',
}
