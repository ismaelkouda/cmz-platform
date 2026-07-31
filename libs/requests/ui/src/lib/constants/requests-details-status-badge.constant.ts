import { RequestsDetailsStatus } from '@cmz/requests-domain';

/** Classes Tailwind badge statut dialog (legacy `StatusStyle` → tokens visuels). */
export const REQUESTS_DETAILS_STATUS_BADGE_CLASS: Record<
    RequestsDetailsStatus,
    string
> = {
    [RequestsDetailsStatus.PENDING]:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    [RequestsDetailsStatus.APPROVED]:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    [RequestsDetailsStatus.REJECTED]:
        'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    [RequestsDetailsStatus.ABANDONED]:
        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    [RequestsDetailsStatus.IN_PROGRESS]:
        'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    [RequestsDetailsStatus.TERMINATED]:
        'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    [RequestsDetailsStatus.CONFIRMED]:
        'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
};
