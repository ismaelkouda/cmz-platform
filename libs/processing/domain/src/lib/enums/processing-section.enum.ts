/**
 * Sections du module `processing` — correspond aux endpoints API :
 *  - QUEUES   → "queues"   (Bac à pioche : signalements en attente)
 *  - TASKS    → "taken"    (Mes tâches : signalements pris en charge)
 *  - ALL      → "processing" (Tous les traitements : vue consolidée)
 */
export enum ProcessingSection {
    QUEUES = 'queues',
    TASKS = 'taken',
    ALL = 'processing',
}
