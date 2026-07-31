/** Statut export (`Status` legacy) — clés i18n. */
export const DownloadReportStatesStatus = {
    PENDING: 'COMMON.PENDING',
    PROCESSING: 'COMMON.PROCESSING',
    DONE: 'COMMON.DONE',
    FAILED: 'COMMON.FAILED',
} as const;

export type DownloadReportStatesStatus =
    (typeof DownloadReportStatesStatus)[keyof typeof DownloadReportStatesStatus];

export const DownloadReportStatesStatusStyle = {
    PENDING: 'COMMON.PENDING_STYLE',
    PROCESSING: 'COMMON.PROCESSING_STYLE',
    DONE: 'COMMON.DONE_STYLE',
    FAILED: 'COMMON.FAILED_STYLE',
} as const;

export type DownloadReportStatesStatusStyle =
    (typeof DownloadReportStatesStatusStyle)[keyof typeof DownloadReportStatesStatusStyle];

export function downloadReportStatesStatusStyle(
    status: DownloadReportStatesStatus
): DownloadReportStatesStatusStyle {
    const map: Record<
        DownloadReportStatesStatus,
        DownloadReportStatesStatusStyle
    > = {
        [DownloadReportStatesStatus.PENDING]:
            DownloadReportStatesStatusStyle.PENDING,
        [DownloadReportStatesStatus.PROCESSING]:
            DownloadReportStatesStatusStyle.PROCESSING,
        [DownloadReportStatesStatus.DONE]: DownloadReportStatesStatusStyle.DONE,
        [DownloadReportStatesStatus.FAILED]:
            DownloadReportStatesStatusStyle.FAILED,
    };
    return map[status];
}
