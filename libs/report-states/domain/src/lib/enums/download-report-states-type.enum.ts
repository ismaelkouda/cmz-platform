/** Type de fichier export (`DownloadType` legacy) — clés i18n. */
export const DownloadReportStatesType = {
    SHAPE: 'COMMON.SHAPE',
    EXCEL: 'COMMON.EXCEL',
} as const;

export type DownloadReportStatesType =
    (typeof DownloadReportStatesType)[keyof typeof DownloadReportStatesType];

export const DownloadReportStatesTypeStyle = {
    SHAPE: 'COMMON.SHAPE_STYLE',
    EXCEL: 'COMMON.EXCEL_STYLE',
} as const;
