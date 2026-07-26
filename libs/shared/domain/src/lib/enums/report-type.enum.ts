/**
 * Type de signalement métier (ABI/ZOB/CPS/CPO) — codes stables = wire API.
 * Labels : @cmz/shared-ui. Ne pas confondre avec TypeReport (étape workflow).
 */
export const ReportType = {
    ABI: 'abi',
    ZOB: 'zob',
    CPS: 'cps',
    CPO: 'cpo',
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

const VALUES = new Set<string>(Object.values(ReportType));

export function isReportType(value: string): value is ReportType {
    return VALUES.has(value);
}
