import { ReportType } from '@cmz/shared-domain';

/** Clés i18n des libellés type de signalement — présentation pure. */
export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
    [ReportType.ABI]: 'COMMON.ABI',
    [ReportType.ZOB]: 'COMMON.ZOB',
    [ReportType.CPS]: 'COMMON.CPS',
    [ReportType.CPO]: 'COMMON.CPO',
};

/** Options filtre / select. */
export const REPORT_TYPE_OPTIONS = (
    Object.values(ReportType) as ReportType[]
).map((value) => ({
    value,
    label: REPORT_TYPE_LABEL[value],
}));
