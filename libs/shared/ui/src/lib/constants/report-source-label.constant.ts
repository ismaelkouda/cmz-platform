import { ReportSource } from '@cmz/shared-domain';

/** Clés i18n des libellés source de signalement — présentation pure. */
export const REPORT_SOURCE_LABEL: Record<ReportSource, string> = {
    [ReportSource.APP]: 'COMMON.APP',
    [ReportSource.PWA]: 'COMMON.PWA',
    [ReportSource.USSD]: 'COMMON.USSD',
    [ReportSource.SMS]: 'COMMON.SMS',
    [ReportSource.IVR]: 'COMMON.IVR',
};

/** Options filtre / select (sans unknown — valeur technique API). */
export const REPORT_SOURCE_OPTIONS = (
    [
        ReportSource.APP,
        ReportSource.PWA,
        ReportSource.USSD,
        ReportSource.SMS,
        ReportSource.IVR,
    ] as const
).map((value) => ({
    value,
    label: REPORT_SOURCE_LABEL[value],
}));
