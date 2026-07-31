/**
 * Sections du module `requests` — alignées sur `FINALIZATION_ENDPOINTS` :
 *  - QUEUES → finalizations/queues
 *  - TASKS  → finalizations/task-baskets
 *  - ALL    → finalizations
 */
export enum FinalizationSection {
    QUEUES = 'finalizations/queues',
    TASKS = 'finalizations/task-baskets',
    ALL = 'finalizations',
}
