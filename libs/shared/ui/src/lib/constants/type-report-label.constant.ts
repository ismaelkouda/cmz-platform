import { TypeReport } from '@cmz/shared-domain';

/**
 * Clés i18n des libellés d'étape workflow.
 * Note source : COMMON.PROCESSING existe ; REQUESTS/FINALIZATION
 * sont surtout des sections racine — clés COMMON.* pour homogénéité.
 */
export const TYPE_REPORT_LABEL: Record<TypeReport, string> = {
    [TypeReport.REQUESTS]: 'COMMON.REQUESTS',
    [TypeReport.PROCESSING]: 'COMMON.PROCESSING',
    [TypeReport.FINALIZATION]: 'COMMON.FINALIZATION',
};

/** Options filtre / select. */
export const TYPE_REPORT_OPTIONS = (
    Object.values(TypeReport) as TypeReport[]
).map((value) => ({
    value,
    label: TYPE_REPORT_LABEL[value],
}));
